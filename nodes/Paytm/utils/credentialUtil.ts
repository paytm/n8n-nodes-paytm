import { PaytmClient } from '../client/PaytmClient';
import {
	PAYTM_API_CREDENTIAL_NAME,
	PAYTM_SECURE_API_ENDPOINT,
	SECURE_PAYMENTS_BASE_URLS,
	type PaytmCredentialEnvironment,
	type PaytmSecureApiOperation,
	ENV,
} from '../constants';
import type { PaytmCredentials } from '../types';

/** Normalizes credential `environment` to `production` or `test`. */
export function resolvePaytmCredentialEnvironment(
	environmentRaw: string | undefined,
): PaytmCredentialEnvironment {
	return environmentRaw === ENV.TEST ? ENV.TEST : ENV.PRODUCTION;
}

/**
 * Full `https://…` URL: secure base for `environment` + path for `operation`, plus optional query string.
 */
export function resolvePaytmSecureApiUrl(
	environmentRaw: string | undefined,
	operation: PaytmSecureApiOperation,
	query?: Record<string, string>,
): string {
	const env = resolvePaytmCredentialEnvironment(environmentRaw);
	const base = SECURE_PAYMENTS_BASE_URLS[env].replace(/\/+$/, '');
	const path = PAYTM_SECURE_API_ENDPOINT[operation];
	const pathNormalized = path.startsWith('/') ? path : `/${path}`;
	const url = new URL(pathNormalized, `${base}/`);
	if (query) {
		for (const [k, v] of Object.entries(query)) {
			if (v !== undefined && v !== '') url.searchParams.set(k, v);
		}
	}
	return url.toString();
}

export async function getClient(context: {
	getCredentials: (name: string) => Promise<Record<string, string>>;
}): Promise<PaytmClient> {
	const creds = await context.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const env = resolvePaytmCredentialEnvironment(creds.environment as string | undefined);
	const baseUrl = SECURE_PAYMENTS_BASE_URLS[env];
	const paytmCreds: PaytmCredentials = {
		merchantId: creds.merchantId as string,
		keySecret: creds.keySecret as string,
		environment: env,
	};
	return new PaytmClient(paytmCreds, baseUrl);
}

export function getBody<T = Record<string, unknown>>(res: { body?: T }): T | undefined {
	return res.body;
}
