import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { Operation } from '../enums';
import type { CancelSubscriptionBody, PaytmChecksumApiResponse } from '../types';
import { getClient, assertPaytmChecksumResponse, getBody } from '../utils/helpers';

export const cancelSubscriptionDescription: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subsId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Subscription ID from initiate subscription or dashboard',
		displayOptions: { show: { operation: [Operation.CANCEL_SUBSCRIPTION] } },
	},
];

export async function executeCancelSubscription(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const subsId = ((this.getNodeParameter('subsId', itemIndex) as string) ?? '').trim();

	if (!subsId) {
		throw new NodeOperationError(this.getNode(), 'Subscription ID (subsId) is required.', { itemIndex });
	}

	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;

	const body: CancelSubscriptionBody = {
		mid,
		subsId,
	};

	const res = (await client.requestWithChecksum(
		'POST',
		'/subscription/cancel',
		body,
	)) as PaytmChecksumApiResponse;
	assertPaytmChecksumResponse(res);
	return getBody(res) ?? res;
}
