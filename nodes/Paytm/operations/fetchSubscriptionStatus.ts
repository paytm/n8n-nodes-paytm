import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { generateSignature } from '../client/checksum';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type { FetchSubscriptionStatusBody, PaytmChecksumApiResponse } from '../types';
import { getBody, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { responseValidation } from '../utils/responseValidationUtil';

export const fetchSubscriptionStatusDescription: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subsId',
		type: 'string',
		default: '',
		placeholder: '123456789012',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		description: 'Order ID to fetch subscription details',
		placeholder: 'ORDER_98765',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
	{
		displayName: 'Link ID',
		name: 'linkId',
		type: 'string',
		default: '',
		description: 'Link ID in case of link based subscription',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
	{
		displayName: 'Customer ID',
		name: 'custId',
		type: 'string',
		default: '',
		description: 'Either use subscription ID or (customer ID + order ID to fetch details)',
		placeholder: 'CUST_001',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
];

function buildFetchSubscriptionStatusPayload(
	innerBody: FetchSubscriptionStatusBody,
	signature: string,
): Record<string, unknown> {
	return {
		body: innerBody,
		head: {
			tokenType: 'AES',
			signature,
			channelId: 'WEB',
		},
	};
}

export async function executeFetchSubscriptionStatus(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const subsId = ((this.getNodeParameter('subsId', itemIndex) as string) ?? '').trim();
	const orderId = ((this.getNodeParameter('orderId', itemIndex) as string) ?? '').trim();
	const linkId = ((this.getNodeParameter('linkId', itemIndex) as string) ?? '').trim();
	const custId = ((this.getNodeParameter('custId', itemIndex) as string) ?? '').trim();

	if (!subsId && !orderId && !linkId) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one of Subscription ID, Order ID, or Link ID is required.',
			{ itemIndex },
		);
	}

	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const mid = creds.merchantId as string;
	const keySecret = String(creds.keySecret ?? '').trim();

	const body: FetchSubscriptionStatusBody = { mid };
	if (subsId) body.subsId = subsId;
	if (orderId) body.orderId = orderId;
	if (linkId) body.linkId = linkId;
	if (custId) body.custId = custId;

	const signature = await generateSignature(body, keySecret);
	const payload = buildFetchSubscriptionStatusPayload(body, signature);

	const res = (await this.helpers.httpRequestWithAuthentication.call(this, PAYTM_API_CREDENTIAL_NAME, {
		method: 'POST',
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'SUBSCRIPTION_CHECK_STATUS'),
		body: payload,
		json: true,
	})) as PaytmChecksumApiResponse;
	responseValidation(res);
	return getBody(res) ?? res;
}
