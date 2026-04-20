import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { generateSignature } from '../client/checksum';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type { CancelSubscriptionBody, PaytmChecksumApiResponse } from '../types';
import { getBody, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { responseValidation } from '../utils/responseValidationUtil';

export const cancelSubscriptionDescription: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subsId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Subscription ID from Paytm dashboard or your subscription flow',
		description: 'Subscription ID to cancel',
		displayOptions: { show: { operation: [Operation.CANCEL_SUBSCRIPTION] } },
	},
];

function buildCancelSubscriptionPayload(
	innerBody: CancelSubscriptionBody,
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

export async function executeCancelSubscription(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const subsId = ((this.getNodeParameter('subsId', itemIndex) as string) ?? '').trim();

	if (!subsId) {
		throw new NodeOperationError(this.getNode(), 'Subscription ID (subsId) is required.', {
			itemIndex,
		});
	}

	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const mid = creds.merchantId as string;
	const keySecret = String(creds.keySecret ?? '').trim();

	const body: CancelSubscriptionBody = {
		mid,
		subsId,
	};

	const signature = await generateSignature(body, keySecret);
	const payload = buildCancelSubscriptionPayload(body, signature);

	const res = (await this.helpers.httpRequestWithAuthentication.call(this, PAYTM_API_CREDENTIAL_NAME, {
		method: 'POST',
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'SUBSCRIPTION_CANCEL'),
		body: payload,
		json: true,
	})) as PaytmChecksumApiResponse;
	responseValidation(res);
	return getBody(res) ?? res;
}
