import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PaytmApi implements ICredentialType {
	name = 'paytmApi';

	displayName = 'Paytm API';

	/** Same URL as `NODE_CONFIG.DOCUMENTATION_URL` in `nodes/Paytm/constants`. */
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
			description: 'Use production for actual payments, test for validating the workflows',
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
			description:
				'API key available on merchant dashboard',
		},
		{
			displayName: 'Merchant Adapter Base URL',
			name: 'merchantAdapterBaseUrl',
			type: 'string',
			default: 'http://localhost:8080',
			placeholder: 'e.g. http://localhost:8080',
			description:
				'Base URL for settlement (RTDD) wrapper — requests go to {base}/merchant-adapter/internal/{function}?mid=…. Leave default for local adapter.',
		},
	];
}
