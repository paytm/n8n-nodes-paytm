import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import PaytmChecksum = require('../client/checksum');
import { Operation } from '../enums';
import type { OrderDetailSettlementBody } from '../types';
import {
	buildSettlementOuterEnvelope,
	getSettlementRuntime,
	SETTLEMENT_FUNCTION,
} from '../utils/settlementUtil';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { settlementResponseValidation } from '../utils/responseValidationUtil';
import { assertMandatoryStrings } from '../utils/fieldValidationUtil';

export const orderDetailDescription: INodeProperties[] = [
	{
		displayName: 'Transaction ID',
		name: 'bizOrderId',
		type: 'string',
		default: '',
		required: true,
		description: 'Transaction ID to fetch details',
		placeholder: '20160904111212800000000000000000000',
		displayOptions: { show: { operation: [Operation.ORDER_DETAIL] } },
	},
	{
		displayName: 'Settlement Details',
		name: 'isSettlementInfo',
		type: 'boolean',
		default: false,
		description: 'Whether to return settlement details in response',
		displayOptions: { show: { operation: [Operation.ORDER_DETAIL] } },
	},
	{
		displayName: 'Exclude Payments Data',
		name: 'excludePaymentsData',
		type: 'boolean',
		default: false,
		description: 'Whether to exclude payment details in response',
		displayOptions: { show: { operation: [Operation.ORDER_DETAIL] } },
	},
];

export async function executeOrderDetail(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const bizOrderId = ((this.getNodeParameter('bizOrderId', itemIndex) as string) ?? '').trim();
	assertMandatoryStrings(this, itemIndex, bizOrderId);
	const isSettlementInfo = this.getNodeParameter('isSettlementInfo', itemIndex) as boolean;
	const excludePaymentsData = this.getNodeParameter('excludePaymentsData', itemIndex) as boolean;

	const rt = await getSettlementRuntime(this);
	const body: OrderDetailSettlementBody = {
		ipRoleId: rt.merchantId,
		bizOrderId,
	};
	if (isSettlementInfo) body.isSettlementInfo = true;
	if (excludePaymentsData) body.excludePaymentsData = true;

	const functionName = SETTLEMENT_FUNCTION.ORDER_DETAIL;
	const base = rt.baseUrl.replace(/\/+$/, '');
	const pathAndQuery = `/merchant-adapter/internal/${functionName}?${new URLSearchParams({ mid: rt.merchantId }).toString()}`;
	const fullUrl = new URL(pathAndQuery, `${base}/`).toString();

	const { requestId, outerBody } = buildSettlementOuterEnvelope(rt, { ...body });
	const signature = await PaytmChecksum.generateSignature(JSON.stringify(outerBody), rt.keySecret);

	const raw = await this.helpers.httpRequestWithAuthentication.call(this, PAYTM_API_CREDENTIAL_NAME, {
		method: 'POST',
		url: fullUrl,
		body: outerBody,
		json: true,
		headers: {
			'Content-Type': 'application/json',
			signature,
			'X-PGP-Unique-ID': requestId,
		},
	});
	return settlementResponseValidation(raw);
}
