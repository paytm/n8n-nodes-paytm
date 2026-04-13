import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { MANDATORY_FIELDS_ERROR_MESSAGE } from '../utils/mandatoryFieldError';
import { Operation } from '../enums';
import type { RtddBizorderSearchRtddBody, RtddSearchCondition } from '../types';
import { normalizeDateOnlyParam } from '../utils/dateParamUtils';
import {
	dateToIsoEnd,
	dateToIsoStart,
	getSettlementAdapterRuntime,
	postMerchantAdapterSettlement,
	SETTLEMENT_ADAPTER_FUNCTION,
} from '../utils/rtddHelpers';

/** All supported biz order types; multi-select default is all selected. */
const BIZ_ORDER_TYPE_OPTIONS = [
	{ name: 'ACQUIRING', value: 'ACQUIRING' },
	{ name: 'CAPTURE', value: 'CAPTURE' },
	{ name: 'REFUND', value: 'REFUND' },
	{ name: 'TOPUP', value: 'TOPUP' },
	{ name: 'TRANSFER', value: 'TRANSFER' },
	{ name: 'WITHDRAW', value: 'WITHDRAW' },
] as const;

const DEFAULT_BIZ_ORDER_TYPES_MULTI = BIZ_ORDER_TYPE_OPTIONS.map((o) => o.value);

const RTDD_OP_SHOW = { operation: [Operation.RTDD_BIZORDER_SEARCH] };

function maxOrderCreatedRangeDaysExceeded(startDateYmd: string, endDateYmd: string): boolean {
	const [sy, sm, sd] = startDateYmd.split('-').map(Number);
	const [ey, em, ed] = endDateYmd.split('-').map(Number);
	const start = new Date(Date.UTC(sy, sm - 1, sd));
	const end = new Date(Date.UTC(ey, em - 1, ed));
	const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
	return diffDays > 186;
}

export const rtddBizorderSearchDescription: INodeProperties[] = [
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		typeOptions: { dateOnly: true },
		default: '',
		required: true,
		description:
			'Start timestamp to fetch transaction level settlement details from',
		displayOptions: { show: RTDD_OP_SHOW },
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		typeOptions: { dateOnly: true },
		default: '',
		required: true,
		description:
			'End timestamp for fetching transaction level settlement details',
		displayOptions: { show: RTDD_OP_SHOW },
	},
	{
		displayName: 'Search Key',
		name: 'searchKey',
		type: 'options',
		default: 'EXT_SERIAL_NO',
		options: [
			{ name: 'Biz Order ID', value: 'BIZ_ORDER_ID' },
			{ name: 'External Serial No', value: 'EXT_SERIAL_NO' },
			{ name: 'Merchant Trans ID', value: 'MERCHANT_TRANS_ID' },
		],
		description:
			'Which identifier field to filter on. Defaults to External Serial No. The value is taken from the matching field below.',
		displayOptions: { show: RTDD_OP_SHOW },
	},
	{
		displayName: 'Biz Order ID',
		name: 'searchValueBizOrderId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. biz order ID',
		displayOptions: {
			show: { ...RTDD_OP_SHOW, searchKey: ['BIZ_ORDER_ID'] },
		},
	},
	{
		displayName: 'External Serial No',
		name: 'searchValueExtSerial',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. transaction / serial reference',
		displayOptions: {
			show: { ...RTDD_OP_SHOW, searchKey: ['EXT_SERIAL_NO'] },
		},
	},
	{
		displayName: 'Merchant Trans ID',
		name: 'searchValueMerchantTrans',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. merchant transaction ID',
		displayOptions: {
			show: { ...RTDD_OP_SHOW, searchKey: ['MERCHANT_TRANS_ID'] },
		},
	},
	{
		displayName: 'Biz Order Types',
		name: 'bizOrderTypes',
		type: 'multiOptions',
		options: [...BIZ_ORDER_TYPE_OPTIONS],
		default: [...DEFAULT_BIZ_ORDER_TYPES_MULTI],
		description:
			'Select the types of orders to fetch. Defaults to all types selected.',
		displayOptions: { show: RTDD_OP_SHOW },
	},
];

export async function executeRtddBizorderSearch(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const startDate = normalizeDateOnlyParam(this.getNodeParameter('startDate', itemIndex));
	const endDate = normalizeDateOnlyParam(this.getNodeParameter('endDate', itemIndex));
	if (!startDate || !endDate) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}
	if (maxOrderCreatedRangeDaysExceeded(startDate, endDate)) {
		throw new NodeOperationError(
			this.getNode(),
			'Order created date range cannot exceed 6 months.',
			{ itemIndex },
		);
	}

	const searchKey = this.getNodeParameter('searchKey', itemIndex) as string;
	let searchValue = '';
	if (searchKey === 'BIZ_ORDER_ID') {
		searchValue = (this.getNodeParameter('searchValueBizOrderId', itemIndex) as string)?.trim();
	} else if (searchKey === 'EXT_SERIAL_NO') {
		searchValue = (this.getNodeParameter('searchValueExtSerial', itemIndex) as string)?.trim();
	} else {
		searchValue = (this.getNodeParameter('searchValueMerchantTrans', itemIndex) as string)?.trim();
	}
	if (!searchValue) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}

	const bizOrderTypesSelected = this.getNodeParameter('bizOrderTypes', itemIndex) as string[];
	let bizOrderTypes =
		Array.isArray(bizOrderTypesSelected) && bizOrderTypesSelected.length > 0
			? [...bizOrderTypesSelected]
			: [...DEFAULT_BIZ_ORDER_TYPES_MULTI];
	if (!bizOrderTypes.length) bizOrderTypes = [...DEFAULT_BIZ_ORDER_TYPES_MULTI];

	const rt = await getSettlementAdapterRuntime(this);
	const searchConditions: RtddSearchCondition[] = [{ searchKey, searchValue }];

	const body: RtddBizorderSearchRtddBody = {
		orderCreatedStartTime: dateToIsoStart(startDate),
		orderCreatedEndTime: dateToIsoEnd(endDate),
		bizOrderTypes,
		searchConditions,
	};

	return postMerchantAdapterSettlement(rt, SETTLEMENT_ADAPTER_FUNCTION.BIZORDER_SEARCH, { ...body });
}
