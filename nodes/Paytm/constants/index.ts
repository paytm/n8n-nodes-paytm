/**
 * Node metadata, documentation URLs, and Paytm API endpoints (production vs test).
 * Keep `nodes/Paytm/Paytm.node.json` documentation resource URLs in sync with `DOCUMENTATION_URLS`.
 */

/** n8n credential type id — must match `credentials/PaytmApi.credentials.ts` `name`. */
export const PAYTM_API_CREDENTIAL_NAME = 'paytmApi' as const;

/** Credential `environment` values (n8n options and URL map keys). */
export const ENV = {
	PRODUCTION: 'production',
	TEST: 'test',
} as const;

export type PaytmCredentialEnvironment = (typeof ENV)[keyof typeof ENV];

export const DOCUMENTATION_URLS = {
	GETTING_STARTED: 'https://www.paytmpayments.com/docs/getting-started',
} as const;

export const PARAM_PLACEHOLDER_URLS = {
	CALLBACK_EXAMPLE: 'https://example.com/callback',
} as const;

// --- Base URLs (one per environment) ---

export const PAYTM_SECURE_BASE_URL_PRODUCTION = 'https://secure.paytmpayments.com';
export const PAYTM_SECURE_BASE_URL_TEST = 'https://securestage.paytmpayments.com';

export const SECURE_PAYMENTS_BASE_URLS: Record<PaytmCredentialEnvironment, string> = {
	[ENV.PRODUCTION]: PAYTM_SECURE_BASE_URL_PRODUCTION,
	[ENV.TEST]: PAYTM_SECURE_BASE_URL_TEST,
};

/** Secure checksum API path segments only (no host). */
export const PAYTM_SECURE_API_ENDPOINT = {
	ORDER_LIST: '/merchant-passbook/search/list/order/v2',
	PAYMENT_LINK_CREATE: '/link/create',
	PAYMENT_LINK_FETCH: '/link/fetch',
	PAYMENT_LINK_FETCH_TRANSACTIONS: '/link/fetchTransaction',
	REFUND_APPLY: '/refund/apply',
	REFUND_STATUS_V2: '/v2/refund/status',
	REFUND_PASSBOOK_LIST: '/merchant-passbook/api/v1/refundList',
	SUBSCRIPTION_CHECK_STATUS: '/subscription/subscription/checkStatus',
	SUBSCRIPTION_STATUS_MODIFY: '/subscription/subscription/status/modify',
	SUBSCRIPTION_CANCEL: '/subscription/subscription/cancel',
} as const;

export type PaytmSecureApiOperation = keyof typeof PAYTM_SECURE_API_ENDPOINT;

export const NODE_CONFIG = {
	/** Paytm developer docs (node “Documentation” link; credential uses `DOCUMENTATION_URLS.GETTING_STARTED`). */
	DOCUMENTATION_URL: DOCUMENTATION_URLS.GETTING_STARTED,
	DISPLAY_NAME: 'Paytm',
	NAME: 'paytm',
	ICON: 'file:assets/paytm.svg',
	GROUP: ['transform'],
	VERSION: 31,
	subtitle: 'Community-maintained Paytm Payments, subscriptions, and settlement APIs',
	/** Still set for API/docs; may appear when browsing by category (not global search). */
	DESCRIPTION: 'Manage payments, subscriptions, refunds, and settlements using Paytm APIs',
	CREDENTIAL_NAME: PAYTM_API_CREDENTIAL_NAME,
};
