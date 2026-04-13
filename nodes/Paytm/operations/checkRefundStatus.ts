import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { Operation } from '../enums';
import type { CheckRefundStatusBody, PaytmChecksumApiResponse } from '../types';
import { getClient, assertPaytmChecksumResponse, getBody } from '../utils/helpers';
import { assertMandatoryStrings } from '../utils/mandatoryFieldError';

export const checkRefundStatusDescription: INodeProperties[] = [
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		required: true,
		description: 'Order id against which the refund was initiated',
		placeholder: 'OREDRID_98765',
		displayOptions: { show: { operation: [Operation.CHECK_REFUND_STATUS] } },
	},
	{
		displayName: 'Refund Reference ID',
		name: 'refId',
		type: 'string',
		default: '',
		required: true,
		description: 'Merchant generated reference id for refund',
		placeholder: 'REFUNDID_98765',
		displayOptions: { show: { operation: [Operation.CHECK_REFUND_STATUS] } },
	},
];

export async function executeCheckRefundStatus(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const orderId = ((this.getNodeParameter('orderId', itemIndex) as string) ?? '').trim();
	const refId = ((this.getNodeParameter('refId', itemIndex) as string) ?? '').trim();
	assertMandatoryStrings(this, itemIndex, orderId, refId);
	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;
	const body: CheckRefundStatusBody = {
		mid,
		orderId,
		refId,
	};
	const res = (await client.requestWithChecksum('POST', '/v2/refund/status', body)) as PaytmChecksumApiResponse;
	assertPaytmChecksumResponse(res);
	return getBody(res) ?? res;
}
