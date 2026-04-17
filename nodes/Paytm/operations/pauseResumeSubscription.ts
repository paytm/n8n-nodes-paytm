import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { generateChecksum } from '../client/checksum';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type { PauseResumeSubscriptionBody, PaytmChecksumApiResponse } from '../types';
import { getClient, getBody, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { responseValidation } from '../utils/responseValidationUtil';

export const pauseResumeSubscriptionDescription: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subsId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Subscription ID to change the status',
		displayOptions: { show: { operation: [Operation.PAUSE_RESUME_SUBSCRIPTION] } },
	},
	{
		displayName: 'Status',
		name: 'subscriptionStatus',
		type: 'options',
		default: 'SUSPENDED',
		required: true,
		options: [
			{ name: 'ACTIVE', value: 'ACTIVE' },
			{ name: 'SUSPENDED', value: 'SUSPENDED' },
		],
		description: 'Desired status to which the subscription needs to be moved',
		displayOptions: { show: { operation: [Operation.PAUSE_RESUME_SUBSCRIPTION] } },
	},
];

function signingStringForPauseResumeSubscriptionBody(innerBody: PauseResumeSubscriptionBody): string {
	return JSON.stringify(innerBody).replace(/\s/g, '');
}

async function generatePauseResumeSubscriptionSignature(
	innerBody: PauseResumeSubscriptionBody,
	keySecret: string,
): Promise<string> {
	const signingInput = signingStringForPauseResumeSubscriptionBody(innerBody);
	return generateChecksum(signingInput, keySecret);
}

function buildPauseResumeSubscriptionPayload(
	innerBody: PauseResumeSubscriptionBody,
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

export async function executePauseResumeSubscription(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const subsId = ((this.getNodeParameter('subsId', itemIndex) as string) ?? '').trim();
	const status = this.getNodeParameter('subscriptionStatus', itemIndex) as 'SUSPENDED' | 'ACTIVE';

	if (!subsId) {
		throw new NodeOperationError(this.getNode(), 'Subscription ID (subsId) is required.', {
			itemIndex,
		});
	}
	if (status !== 'SUSPENDED' && status !== 'ACTIVE') {
		throw new NodeOperationError(this.getNode(), 'Status must be SUSPENDED or ACTIVE.', {
			itemIndex,
		});
	}

	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const client = await getClient(this);
	const mid = creds.merchantId as string;
	const keySecret = String(creds.keySecret ?? '').trim();

	const body: PauseResumeSubscriptionBody = {
		mid,
		subsId,
		status,
	};

	const signature = await generatePauseResumeSubscriptionSignature(body, keySecret);
	const payload = buildPauseResumeSubscriptionPayload(body, signature);

	const res = (await client.postClientCall({
		body: payload,
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'SUBSCRIPTION_STATUS_MODIFY'),
	})) as PaytmChecksumApiResponse;
	responseValidation(res);
	return getBody(res) ?? res;
}
