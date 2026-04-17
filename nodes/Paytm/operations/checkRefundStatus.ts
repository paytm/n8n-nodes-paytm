import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { generateChecksum } from '../client/checksum';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type { CheckRefundStatusBody, PaytmChecksumApiResponse } from '../types';
import { getClient, getBody, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { responseValidation } from '../utils/responseValidationUtil';
import { assertMandatoryStrings } from '../utils/fieldValidationUtil';

export const checkRefundStatusDescription: INodeProperties[] = [
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		required: true,
		description: 'Order ID against which the refund was initiated',
		placeholder: 'OREDRID_98765',
		displayOptions: { show: { operation: [Operation.CHECK_REFUND_STATUS] } },
	},
	{
		displayName: 'Refund Reference ID',
		name: 'refId',
		type: 'string',
		default: '',
		required: true,
		description: 'Merchant generated reference ID for refund',
		placeholder: 'REFUNDID_98765',
		displayOptions: { show: { operation: [Operation.CHECK_REFUND_STATUS] } },
	},
];

function signingStringForCheckRefundStatusBody(innerBody: CheckRefundStatusBody): string {
	return JSON.stringify(innerBody).replace(/\s/g, '');
}

async function generateCheckRefundStatusSignature(
	innerBody: CheckRefundStatusBody,
	keySecret: string,
): Promise<string> {
	const signingInput = signingStringForCheckRefundStatusBody(innerBody);
	return generateChecksum(signingInput, keySecret);
}

function buildCheckRefundStatusPayload(
	innerBody: CheckRefundStatusBody,
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

export async function executeCheckRefundStatus(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const orderId = ((this.getNodeParameter('orderId', itemIndex) as string) ?? '').trim();
	const refId = ((this.getNodeParameter('refId', itemIndex) as string) ?? '').trim();
	assertMandatoryStrings(this, itemIndex, orderId, refId);
	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const client = await getClient(this);
	const mid = creds.merchantId as string;
	const keySecret = String(creds.keySecret ?? '').trim();
	const body: CheckRefundStatusBody = {
		mid,
		orderId,
		refId,
	};
	const signature = await generateCheckRefundStatusSignature(body, keySecret);
	const payload = buildCheckRefundStatusPayload(body, signature);

	const res = (await client.postClientCall({
		body: payload,
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'REFUND_STATUS_V2'),
	})) as PaytmChecksumApiResponse;
	responseValidation(res);
	return getBody(res) ?? res;
}
