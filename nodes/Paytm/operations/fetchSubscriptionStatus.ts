import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { Operation } from '../enums';
import type { FetchSubscriptionStatusBody, PaytmChecksumApiResponse } from '../types';
import { getClient, assertPaytmChecksumResponse, getBody } from '../utils/helpers';

export const fetchSubscriptionStatusDescription: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subsId',
		type: 'string',
		default: '',
		placeholder: 'subsId from initiate subscription',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
	{
		displayName: 'Link ID',
		name: 'linkId',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
	{
		displayName: 'Customer ID',
		name: 'custId',
		type: 'string',
		default: '',
		description: 'Optional; can be sent with orderId',
		displayOptions: { show: { operation: [Operation.FETCH_SUBSCRIPTION_STATUS] } },
	},
];

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

	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;

	const body: FetchSubscriptionStatusBody = { mid };
	if (subsId) body.subsId = subsId;
	if (orderId) body.orderId = orderId;
	if (linkId) body.linkId = linkId;
	if (custId) body.custId = custId;

	const res = (await client.requestWithChecksum(
		'POST',
		'/subscription/checkStatus',
		body,
	)) as PaytmChecksumApiResponse;
	assertPaytmChecksumResponse(res);
	return getBody(res) ?? res;
}
