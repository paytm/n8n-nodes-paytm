import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import PaytmChecksum = require('../nodes/Paytm/client/checksum');
import { SECURE_PAYMENTS_BASE_URLS } from '../nodes/Paytm/constants';
import { resolvePaytmCredentialEnvironment } from '../nodes/Paytm/utils/credentialUtil';

function resolvePaytmBaseUrl(environmentRaw: string | undefined): string {
	const env = resolvePaytmCredentialEnvironment(environmentRaw);
	return SECURE_PAYMENTS_BASE_URLS[env];
}

/**
 * Marker key on the credential test `request.body` (see `PaytmApi.credentials.ts`) so this hook can tell
 * **credential Test** from **node** `httpRequestWithAuthentication` calls. Do not send this key from Paytm node operations.
 */
export const PAYTM_CREDENTIAL_TEST_MARKER_KEY = '__n8nPaytmCredentialTest' as const;

function isPaytmCredentialTestRequest(ro: IHttpRequestOptions): boolean {
	const body = ro.body;
	if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
	return (body as Record<string, unknown>)[PAYTM_CREDENTIAL_TEST_MARKER_KEY] === true;
}

/** Checksum-signed HTTP auth for Paytm API credentials (credential Test + `httpRequestWithAuthentication`). */
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

	// Node traffic: keep URL/body/headers from the operation (marker is only on credential Test).
	if (!isPaytmCredentialTestRequest(requestOptions)) {
		return {
			...requestOptions,
			method: requestOptions.method ?? 'POST',
			headers: {
				...(requestOptions.headers ?? {}),
				'Content-Type': 'application/json',
			},
			json: requestOptions.json !== false,
		};
	}

	// Credential Test: test `request` sends marker body — replace with signed `{ mid }` probe to `/link/fetch`.
	const body = { mid };
	// Match paytmpayments-mcp-server: sign compact JSON of body so Paytm validates checksum the same way as production calls.
	const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), keySecret);
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
		baseURL: requestOptions.baseURL ?? baseURL,
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
