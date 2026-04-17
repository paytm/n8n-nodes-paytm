import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { generateChecksum } from '../nodes/Paytm/client/checksum';
import { SECURE_PAYMENTS_BASE_URLS } from '../nodes/Paytm/constants';
import { resolvePaytmCredentialEnvironment } from '../nodes/Paytm/utils/credentialUtil';

function resolvePaytmBaseUrl(environmentRaw: string | undefined): string {
	const env = resolvePaytmCredentialEnvironment(environmentRaw);
	return SECURE_PAYMENTS_BASE_URLS[env];
}

/** Checksum-signed HTTP auth for Paytm API credentials (credential Test + any flow using `authenticate`). */
export async function authenticatePaytmApi(
	credentials: ICredentialDataDecryptedObject,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const mid = (credentials.merchantId as string | undefined)?.trim();
	const keySecret = (credentials.keySecret as string | undefined)?.trim();
	if (!mid || !keySecret) {
		throw new Error('Merchant ID and Key Secret are required.');
	}
	const baseURL = resolvePaytmBaseUrl(credentials.environment as string | undefined);
	const body = { mid };
	const signingString = JSON.stringify(body).replace(/\s/g, '');
	const signature = await generateChecksum(signingString, keySecret);
	const payload = {
		body,
		head: {
			tokenType: 'AES',
			signature,
			channelId: 'WEB',
		},
	};
	return {
		...requestOptions,
		baseURL,
		method: 'POST',
		url: '/link/fetch',
		body: payload,
		headers: {
			...(requestOptions.headers ?? {}),
			'Content-Type': 'application/json',
		},
		json: true,
	};
}

export const paytmApiTestRequest: ICredentialTestRequest = {
	request: {
		method: 'POST',
		url: '/link/fetch',
	},
};
