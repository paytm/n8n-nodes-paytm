import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import { Operation } from '../enums';
import type { SettlementTxnListByDateRtddBody } from '../types';
import { normalizeDateOnlyParam } from '../utils/dateParamUtils';
import {
	dateToIsoEnd,
	dateToIsoStart,
	getSettlementAdapterRuntime,
	postMerchantAdapterSettlement,
	SETTLEMENT_ADAPTER_FUNCTION,
} from '../utils/rtddHelpers';
import { MANDATORY_FIELDS_ERROR_MESSAGE } from '../utils/mandatoryFieldError';

const SETTLEMENT_TXN_LIST_SHOW = { show: { operation: [Operation.SETTLEMENT_TXN_LIST_BY_DATE] } };

/** Optional pagination and filters — Add Field pattern. */
const SETTLEMENT_TXN_LIST_ADDITIONAL_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Page Number',
		name: 'pageNum',
		type: 'number',
		default: 1,
		description: 'Page index to fetch',
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 20,
		typeOptions: { minValue: 1 },
		description: 'Number of records to fetch in one request',
	},
	{
		displayName: 'Settlement Order ID',
		name: 'settlementOrderId',
		type: 'string',
		default: '',
		description: 'Search by settlement or payout order ID',
	},
];

export const settlementTxnListByDateDescription: INodeProperties[] = [
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'Fetch by settlement start time',
		displayOptions: SETTLEMENT_TXN_LIST_SHOW,
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'Fetch by settlement end time',
		displayOptions: SETTLEMENT_TXN_LIST_SHOW,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Optional: page number, page size, and/or settlement order ID. If omitted, defaults are page 1 and size 20.',
		displayOptions: SETTLEMENT_TXN_LIST_SHOW,
		options: SETTLEMENT_TXN_LIST_ADDITIONAL_OPTIONS,
	},
];

export async function executeSettlementTxnListByDate(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const startDate = normalizeDateOnlyParam(this.getNodeParameter('startDate', itemIndex));
	const endDate = normalizeDateOnlyParam(this.getNodeParameter('endDate', itemIndex));
	if (!startDate || !endDate) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}

	const additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
	const pageNum = numberFromAdditional(additionalRaw, 'pageNum', 1);
	const pageSize = numberFromAdditional(additionalRaw, 'pageSize', 20);
	const settlementOrderId = trimStr(additionalRaw.settlementOrderId);

	const rt = await getSettlementAdapterRuntime(this);
	const body: SettlementTxnListByDateRtddBody = {
		ipRoleId: rt.merchantId,
		settlementStartTime: dateToIsoStart(startDate),
		settlementEndTime: dateToIsoEnd(endDate),
		pageNum,
		pageSize,
	};
	if (settlementOrderId) body.settlementOrderId = settlementOrderId;

	return postMerchantAdapterSettlement(rt, SETTLEMENT_ADAPTER_FUNCTION.TXN_LIST_BY_DATE, {
		...body,
	});
}

function trimStr(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

function numberFromAdditional(raw: IDataObject, key: string, fallback: number): number {
	const v = raw[key];
	if (v === undefined || v === null || v === '') return fallback;
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
}
