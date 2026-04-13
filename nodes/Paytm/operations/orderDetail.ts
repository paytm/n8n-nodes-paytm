import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { Operation } from '../enums';
import type { OrderDetailRtddBody } from '../types';
import {
	getSettlementAdapterRuntime,
	postMerchantAdapterSettlement,
	SETTLEMENT_ADAPTER_FUNCTION,
} from '../utils/rtddHelpers';
import { assertMandatoryStrings } from '../utils/mandatoryFieldError';

export const orderDetailDescription: INodeProperties[] = [
	{
		displayName: 'Biz Order ID',
		name: 'bizOrderId',
		type: 'string',
		default: '',
		required: true,
		description: 'Order ID to fetch details',
		placeholder: '20160904111212800000000000000000000',
		displayOptions: { show: { operation: [Operation.ORDER_DETAIL] } },
	},
	{
		displayName: 'Is Settlement Info',
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

export async function executeOrderDetail(this: IExecuteFunctions, itemIndex: number): Promise<unknown> {
	const bizOrderId = ((this.getNodeParameter('bizOrderId', itemIndex) as string) ?? '').trim();
	assertMandatoryStrings(this, itemIndex, bizOrderId);
	const isSettlementInfo = this.getNodeParameter('isSettlementInfo', itemIndex) as boolean;
	const excludePaymentsData = this.getNodeParameter('excludePaymentsData', itemIndex) as boolean;

	const rt = await getSettlementAdapterRuntime(this);
	const body: OrderDetailRtddBody = {
		ipRoleId: rt.merchantId,
		bizOrderId,
	};
	if (isSettlementInfo) body.isSettlementInfo = true;
	if (excludePaymentsData) body.excludePaymentsData = true;

	return postMerchantAdapterSettlement(rt, SETTLEMENT_ADAPTER_FUNCTION.ORDER_DETAIL, { ...body });
}
