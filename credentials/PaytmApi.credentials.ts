import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IAuthenticateGeneric,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

import PaytmChecksum = require('../nodes/Paytm/client/checksum');
import { resolvePaytmCredentialEnvironment } from '../nodes/Paytm/utils/credentialUtil';

function resolvePaytmBaseUrl(environmentRaw: string | undefined): string {
	return resolvePaytmCredentialEnvironment(environmentRaw) === 'test'
		? 'https://securestage.paytmpayments.com'
		: 'https://secure.paytmpayments.com';
}

/** True when credential `test.request.body` uses `{ testCredential: true }`. Do not set from node operations. */
function isPaytmCredentialTestRequest(ro: IHttpRequestOptions): boolean {
	const body = ro.body;
	if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
	return (body as Record<string, unknown>).testCredential === true;
}

function mergePaytmGenericIntoRequest(
	requestOptions: IHttpRequestOptions,
	generic: IAuthenticateGeneric,
): IHttpRequestOptions {
	if (generic.type !== 'generic') return requestOptions;
	const merged: IHttpRequestOptions = { ...requestOptions };
	for (const [outerKey, outerValue] of Object.entries(generic.properties)) {
		if (!outerValue || typeof outerValue !== 'object' || Array.isArray(outerValue)) {
			continue;
		}
		if (outerKey !== 'headers' && outerKey !== 'body' && outerKey !== 'qs') {
			continue;
		}
		const prev = merged[outerKey];
		const base =
			prev && typeof prev === 'object' && !Array.isArray(prev)
				? { ...(prev as Record<string, unknown>) }
				: {};
		merged[outerKey] = {
			...base,
			...(outerValue as Record<string, unknown>),
		} as never;
	}
	return merged;
}

async function paytmAuthenticate(
	credentials: ICredentialDataDecryptedObject,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const mid = (credentials.merchantId as string | undefined)?.trim();
	const keySecret = (credentials.keySecret as string | undefined)?.trim();
	if (!mid || !keySecret) {
		throw new Error('Merchant ID and Key Secret are required.');
	}
	const baseURL = resolvePaytmBaseUrl(credentials.environment as string | undefined);

	if (!isPaytmCredentialTestRequest(requestOptions)) {
		const withDefaults = mergePaytmGenericIntoRequest(requestOptions, {
			type: 'generic',
			properties: {
				headers: {
					'Content-Type': 'application/json',
				},
			},
		});
		return {
			...withDefaults,
			method: withDefaults.method ?? 'POST',
			json: withDefaults.json !== false,
			body: requestOptions.body,
		};
	}

	const body = { mid };
	const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), keySecret);
	const payload = {
		body,
		head: {
			tokenType: 'AES',
			signature,
			channelId: 'WEB',
		},
	};
	const withDefaults = mergePaytmGenericIntoRequest(requestOptions, {
		type: 'generic',
		properties: {
			headers: {
				'Content-Type': 'application/json',
			},
		},
	});
	return {
		...withDefaults,
		baseURL: requestOptions.baseURL ?? baseURL,
		method: 'POST',
		url: '/link/fetch',
		body: payload,
		json: true,
	};
}

export class PaytmApi implements ICredentialType {
	name = 'paytmApi';

	displayName = 'Paytm API';

	documentationUrl = 'https://www.paytmpayments.com/docs/getting-started';

	/** Enables n8n to inject “Allowed HTTP Request Domains” (see n8n `load-nodes-and-credentials`). */
	genericAuth = true;

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'production',
			options: [
				{ name: 'Production', value: 'production' },
				{ name: 'Test', value: 'test' },
			],
			description: 'Production for actual payments, test environment for workflow validations',
		},
		{
			displayName: 'Merchant ID',
			name: 'merchantId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Paytm MID available on merchant dashboard',
			placeholder: 'YOUR_MID',
		},
		{
			displayName: 'Key Secret',
			name: 'keySecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key available on merchant dashboard',
		},
	];

	authenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => paytmAuthenticate(credentials, requestOptions);

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: 'https://secure.paytmpayments.com/link/fetch',
			json: true,
			body: {
				testCredential: true,
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'body.resultInfo.resultMessage',
					value: 'Checksum provided is invalid.',
					message: 'Authorization failed - please check your credentials',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'body.resultInfo.resultMessage',
					value: 'Error while fetching merchant preference Detail',
					message: 'Authorization failed - please check your credentials',
				},
			},
		],
	};
}
