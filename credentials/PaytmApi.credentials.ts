import type { ICredentialType, INodeProperties } from 'n8n-workflow';

import { DOCUMENTATION_URLS, ENV, PAYTM_API_CREDENTIAL_NAME } from '../nodes/Paytm/constants';
import { authenticatePaytmApi, paytmApiTestRequest } from './paytmApiAuthenticate';

export class PaytmApi implements ICredentialType {
	name = PAYTM_API_CREDENTIAL_NAME;

	displayName = 'Paytm API';

	/** Same URL as `NODE_CONFIG.DOCUMENTATION_URL` / `DOCUMENTATION_URLS.GETTING_STARTED`. */
	documentationUrl = DOCUMENTATION_URLS.GETTING_STARTED;

	/** Enables n8n to inject “Allowed HTTP Request Domains” (see n8n `load-nodes-and-credentials`). */
	genericAuth = true;

	authenticate = authenticatePaytmApi;

	test = paytmApiTestRequest;

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
}
