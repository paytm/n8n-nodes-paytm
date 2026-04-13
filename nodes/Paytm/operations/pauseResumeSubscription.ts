import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { Operation } from '../enums';
import type { PauseResumeSubscriptionBody, PaytmChecksumApiResponse } from '../types';
import { getClient, assertPaytmChecksumResponse, getBody } from '../utils/helpers';

export const pauseResumeSubscriptionDescription: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subsId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'subsId from initiate subscription or dashboard',
		displayOptions: { show: { operation: [Operation.PAUSE_RESUME_SUBSCRIPTION] } },
	},
	{
		displayName: 'Status',
		name: 'subscriptionStatus',
		type: 'options',
		default: 'SUSPENDED',
		required: true,
		options: [
			{ name: 'Pause (SUSPENDED)', value: 'SUSPENDED' },
			{ name: 'Resume (ACTIVE)', value: 'ACTIVE' },
		],
		displayOptions: { show: { operation: [Operation.PAUSE_RESUME_SUBSCRIPTION] } },
	},
];

export async function executePauseResumeSubscription(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const subsId = ((this.getNodeParameter('subsId', itemIndex) as string) ?? '').trim();
	const status = this.getNodeParameter('subscriptionStatus', itemIndex) as 'SUSPENDED' | 'ACTIVE';

	if (!subsId) {
		throw new NodeOperationError(this.getNode(), 'Subscription ID (subsId) is required.', { itemIndex });
	}
	if (status !== 'SUSPENDED' && status !== 'ACTIVE') {
		throw new NodeOperationError(this.getNode(), 'Status must be SUSPENDED or ACTIVE.', { itemIndex });
	}

	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;

	const body: PauseResumeSubscriptionBody = {
		mid,
		subsId,
		status,
	};

	const res = (await client.requestWithChecksum(
		'POST',
		'/subscription/subscription/status/modify',
		body,
	)) as PaytmChecksumApiResponse;
	assertPaytmChecksumResponse(res);
	return getBody(res) ?? res;
}
