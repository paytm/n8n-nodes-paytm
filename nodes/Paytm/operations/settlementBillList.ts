import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import { Operation } from '../enums';
import type { SettlementBillListBody } from '../types';
import { toIsoDateTimeString, toYyyyMmDdThhMmSsPlus0530 } from '../utils/dateParamUtils';
import { generateChecksum } from '../client/checksum';
import {
	buildSettlementOuterEnvelope,
	getSettlementRuntime,
	SETTLEMENT_FUNCTION,
} from '../utils/settlementUtil';
import { getClient } from '../utils/credentialUtil';
import { settlementResponseValidation } from '../utils/responseValidationUtil';
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
		displayName: 'Settlement Start Time',
		name: 'settlementStartTime',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Fetch by settlement start time',
		displayOptions: SETTLEMENT_BILL_LIST_SHOW,
	},
	{
		displayName: 'Settlement End Time',
		name: 'settlementEndTime',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Fetch by settlement end time',
		displayOptions: SETTLEMENT_BILL_LIST_SHOW,
	},
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
		description: 'Optional filters: payout ID, UTR, settle status',
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
	let settlementStartRaw = toIsoDateTimeString(
		this.getNodeParameter('settlementStartTime', itemIndex, ''),
	);
	let settlementEndRaw = toIsoDateTimeString(
		this.getNodeParameter('settlementEndTime', itemIndex, ''),
	);

	if (!settlementStartRaw || !settlementEndRaw) {
		throw new NodeOperationError(
			this.getNode(),
			'Settlement Start Time and Settlement End Time are required (date and time).',
			{ itemIndex },
		);
	}

	const rt = await getSettlementRuntime(this);
	const body: SettlementBillListBody = {
		ipRoleId: rt.merchantId,
		settlementStartTime: toYyyyMmDdThhMmSsPlus0530(settlementStartRaw),
		settlementEndTime: toYyyyMmDdThhMmSsPlus0530(settlementEndRaw),
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

	const functionName = SETTLEMENT_FUNCTION.BILL_LIST;
	const base = rt.baseUrl.replace(/\/+$/, '');
	const pathAndQuery = `/merchant-adapter/internal/${functionName}?${new URLSearchParams({ mid: rt.merchantId }).toString()}`;
	const fullUrl = new URL(pathAndQuery, `${base}/`).toString();

	const { requestId, outerBody } = buildSettlementOuterEnvelope(rt, { ...body });
	const signingString = JSON.stringify(outerBody).replace(/\s/g, '');
	const signature = await generateChecksum(signingString, rt.keySecret);

	const client = await getClient(this);
	const raw = await client.postClientCall({
		url: fullUrl,
		body: outerBody,
		headers: {
			'Content-Type': 'application/json',
			signature,
			'X-PGP-Unique-ID': requestId,
		},
	});
	return settlementResponseValidation(raw);
}
