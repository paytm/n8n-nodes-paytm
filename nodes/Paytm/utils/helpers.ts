import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { PaytmClient } from '../client/PaytmClient';
import type { PaytmChecksumApiResponse, PaytmCredentials } from '../types';

const BASE_URLS: Record<string, string> = {
	production: 'https://secure.paytmpayments.com',
	test: 'https://securestage.paytmpayments.com',
};

/** Maps older stored credential values (e.g. `product`) to current keys. */
const LEGACY_ENVIRONMENT: Record<string, 'production' | 'test'> = {
	product: 'production',
	stage: 'test',
};

export async function getClient(context: {
	getCredentials: (name: string) => Promise<Record<string, string>>;
}): Promise<PaytmClient> {
	const creds = await context.getCredentials('paytmApi');
	const raw = (creds.environment as string) || 'production';
	const environment = LEGACY_ENVIRONMENT[raw] ?? raw;
	const baseUrl = BASE_URLS[environment] ?? BASE_URLS.production;
	const paytmCreds: PaytmCredentials = {
		merchantId: creds.merchantId as string,
		keySecret: creds.keySecret as string,
		environment,
	};
	return new PaytmClient(paytmCreds, baseUrl);
}

/** Build a client from decrypted credential data (e.g. credential UI test). */
export function createPaytmClientFromCredentialData(
	data: ICredentialDataDecryptedObject | undefined,
): PaytmClient {
	const raw = (data?.environment as string) || 'production';
	const environment = LEGACY_ENVIRONMENT[raw] ?? raw;
	const baseUrl = BASE_URLS[environment] ?? BASE_URLS.production;
	const paytmCreds: PaytmCredentials = {
		merchantId: (data?.merchantId as string) ?? '',
		keySecret: (data?.keySecret as string) ?? '',
		environment,
	};
	return new PaytmClient(paytmCreds, baseUrl);
}

export function getBody<T = Record<string, unknown>>(res: { body?: T }): T | undefined {
	return res.body;
}

/**
 * Ensures we received a usable checksum-API envelope from Paytm.
 * Does **not** throw on `resultStatus` PENDING / FAILURE — those are returned in `body` for the workflow to handle.
 */
export function assertPaytmChecksumResponse(res: unknown): asserts res is PaytmChecksumApiResponse {
	if (res === null || res === undefined) {
		throw new Error('No response received from Paytm');
	}
	if (typeof res !== 'object' || Array.isArray(res)) {
		throw new Error('Invalid response from Paytm');
	}
	const r = res as Record<string, unknown>;
	if (Object.keys(r).length === 0) {
		throw new Error('Empty response from Paytm');
	}
	if (r.body === undefined || r.body === null) {
		throw new Error('No response body from Paytm');
	}
}
