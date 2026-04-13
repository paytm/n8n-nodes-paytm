import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import { Operation } from '../enums';
import type { SettlementBillListRtddBody } from '../types';
import { formatPaytmPassbookDateTime, normalizeDateTimeParam } from '../utils/dateParamUtils';
import {
	getSettlementAdapterRuntime,
	postMerchantAdapterSettlement,
	SETTLEMENT_ADAPTER_FUNCTION,
} from '../utils/rtddHelpers';
const SETTLEMENT_BILL_LIST_SHOW = { show: { operation: [Operation.SETTLEMENT_BILL_LIST] } };

const SETTLEMENT_BILL_LIST_ADDITIONAL_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Settlement Bill ID',
		name: 'settlementBillId',
		type: 'string',
		default: '',
		placeholder: 'ALLxxxxxxxxxxxxxxxxxx11',
		description: 'Payout ID',
	},
	{
		displayName: 'Settlement End Time',
		name: 'settlementEndTime',
		type: 'dateTime',
		default: '',
		description: 'Fetch by settlement end time (date and time)',
	},
	{
		displayName: 'Settlement Start Time',
		name: 'settlementStartTime',
		type: 'dateTime',
		default: '',
		description: 'Fetch by settlement start time (date and time)',
	},
	{
		displayName: 'Settle Status',
		name: 'settleStatus',
		type: 'options',
		default: '',
		options: [
			{ name: 'Any', value: '' },
			{ name: 'Bank Initiated', value: 'BANK_INITIATED' },
			{ name: 'Payout Settled', value: 'PAYOUT_SETTLED' },
			{ name: 'Payout Unsettled', value: 'PAYOUT_UNSETTLED' },
			{ name: 'Wait for Settle', value: 'WAIT_FOR_SETTLE' },
		],
		description: 'Filter by settlement status',
	},
	{
		displayName: 'UTR No',
		name: 'utrNo',
		type: 'string',
		default: '',
		placeholder: '212346548404',
		description: 'Fetch details by UTR number',
	},
];

function trimStr(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

export const settlementBillListDescription: INodeProperties[] = [
	{
		displayName: 'Page Number',
		name: 'pageNum',
		type: 'number',
		default: 1,
		description: 'Number of pages to fetch',
		displayOptions: SETTLEMENT_BILL_LIST_SHOW,
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 20,
		typeOptions: { minValue: 1, maxValue: 50 },
		description: 'Number of settlements to fetch in one iteration (max 50)',
		displayOptions: SETTLEMENT_BILL_LIST_SHOW,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Add Field: settlement start/end (date and time), payout ID, UTR, settle status. Both settlement times are required to call the API; other keys are optional.',
		displayOptions: SETTLEMENT_BILL_LIST_SHOW,
		options: SETTLEMENT_BILL_LIST_ADDITIONAL_OPTIONS,
	},
];

export async function executeSettlementBillList(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const pageNum = this.getNodeParameter('pageNum', itemIndex) as number;
	const pageSize = this.getNodeParameter('pageSize', itemIndex) as number;

	const additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	let settlementStartRaw = normalizeDateTimeParam(additionalRaw.settlementStartTime);
	let settlementEndRaw = normalizeDateTimeParam(additionalRaw.settlementEndTime);
	if (!settlementStartRaw || !settlementEndRaw) {
		try {
			if (!settlementStartRaw) {
				settlementStartRaw = normalizeDateTimeParam(
					this.getNodeParameter('settlementStartTime', itemIndex),
				);
			}
			if (!settlementEndRaw) {
				settlementEndRaw = normalizeDateTimeParam(
					this.getNodeParameter('settlementEndTime', itemIndex),
				);
			}
		} catch {
			/* legacy top-level fields removed from description */
		}
	}
	if (!settlementStartRaw || !settlementEndRaw) {
		throw new NodeOperationError(
			this.getNode(),
			'Get a settlement summary: add both Settlement Start Time and Settlement End Time under Additional Fields (Add Field). They use date and time.',
			{ itemIndex },
		);
	}

	const rt = await getSettlementAdapterRuntime(this);
	const body: SettlementBillListRtddBody = {
		ipRoleId: rt.merchantId,
		settledStartTime: formatPaytmPassbookDateTime(settlementStartRaw),
		settledEndTime: formatPaytmPassbookDateTime(settlementEndRaw),
		pageNum,
		pageSize,
		isSort: true,
		isFilterZeroAmount: true,
		isEventFlow: true,
	};

	const settlementBillId = trimStr(additionalRaw.settlementBillId);
	if (settlementBillId) {
		body.settlementBillId = settlementBillId;
	}
	const utrNo = trimStr(additionalRaw.utrNo);
	if (utrNo) {
		body.utrNo = utrNo;
	}

	const settleStatus = trimStr(additionalRaw.settleStatus);
	if (settleStatus) {
		body.settleStatus = settleStatus;
	}

	return postMerchantAdapterSettlement(rt, SETTLEMENT_ADAPTER_FUNCTION.BILL_LIST, { ...body });
}
