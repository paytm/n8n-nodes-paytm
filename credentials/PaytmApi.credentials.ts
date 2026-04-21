import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

import {
	DOCUMENTATION_URLS,
	ENV,
	PAYTM_API_CREDENTIAL_NAME,
	PAYTM_SECURE_BASE_URL_PRODUCTION,
	PAYTM_SECURE_BASE_URL_TEST,
} from '../nodes/Paytm/constants';
import { authenticatePaytmApi, PAYTM_CREDENTIAL_TEST_MARKER_KEY } from './paytmApiAuthenticate';

export class PaytmApi implements ICredentialType {
	name = PAYTM_API_CREDENTIAL_NAME;

	displayName = 'Paytm API';

	/** Same URL as `NODE_CONFIG.DOCUMENTATION_URL` / `DOCUMENTATION_URLS.GETTING_STARTED`. */
	documentationUrl = DOCUMENTATION_URLS.GETTING_STARTED;

	/** Enables n8n to inject “Allowed HTTP Request Domains” (see n8n `load-nodes-and-credentials`). */
	genericAuth = true;

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: ENV.PRODUCTION,
			options: [
				{ name: 'Production', value: ENV.PRODUCTION },
				{ name: 'Test', value: ENV.TEST },
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
			placeholder: 'e.g. YOUR_MID',
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

	authenticate = authenticatePaytmApi;

	/**
	 * Credential connection test (declared only here; marker is read in `paytmApiAuthenticate.ts`).
	 * Paytm often returns HTTP 200 with `body.resultInfo.resultStatus` !== `S` on bad MID/secret or checksum.
	 * n8n only shows “Couldn’t connect…” if the test returns an error — use `rules` so non-success bodies fail.
	 * @see https://docs.n8n.io/integrations/creating-nodes/build/reference/credentials-files/ (`test` → `rules`)
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: `={{ $credentials.environment === '${ENV.TEST}' ? '${PAYTM_SECURE_BASE_URL_TEST}' : '${PAYTM_SECURE_BASE_URL_PRODUCTION}' }}`,
			method: 'POST',
			url: '/link/fetch',
			json: true,
			body: {
				[PAYTM_CREDENTIAL_TEST_MARKER_KEY]: true,
			},
		},
		rules: [
			// Paytm checksum APIs often return HTTP 200 with failure in JSON; n8n treats 2xx as OK unless a rule matches.
			// Cover both full envelope (`body.resultInfo…`) and inner-body-only shapes (`resultInfo…`).
			...(
				[
					'body.resultInfo.resultStatus',
					'resultInfo.resultStatus',
				] as const
			).flatMap((key) =>
				['F', 'FAIL', 'FAILED', 'FAILURE', 'TXN_FAILURE', 'U'].map((value) => ({
					type: 'responseSuccessBody' as const,
					properties: {
						key,
						value,
						message:
							'Authorization failed - please check your credentials',
					},
				})),
			),
		],
	};
}
