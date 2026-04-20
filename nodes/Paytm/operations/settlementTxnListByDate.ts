import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import { Operation } from '../enums';
import type { SettlementTxnListByDateBody } from '../types';
import { toIsoDateTimeString, toYyyyMmDd } from '../utils/dateParamUtils';
import { generateSignature } from '../client/checksum';
import {
	buildSettlementOuterEnvelope,
	dateToIsoEnd,
	dateToIsoStart,
	getSettlementRuntime,
	SETTLEMENT_FUNCTION,
} from '../utils/settlementUtil';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { settlementResponseValidation } from '../utils/responseValidationUtil';
import { MANDATORY_FIELDS_ERROR_MESSAGE } from '../utils/fieldValidationUtil';

const SETTLEMENT_TXN_LIST_SHOW = { show: { operation: [Operation.SETTLEMENT_TXN_LIST_BY_DATE] } };

/** Optional pagination and filters — Add Field pattern. */
const SETTLEMENT_TXN_LIST_ADDITIONAL_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Page Number',
		name: 'pageNum',
		type: 'number',
		default: 1,
		description: 'Number of pages to fetch',
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 20,
		typeOptions: { minValue: 1 },
		description: 'Numbers of records to fetch in one iteration',
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
	const additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
	let startDate = toYyyyMmDd(
		toIsoDateTimeString(this.getNodeParameter('startDate', itemIndex, '')),
	);
	let endDate = toYyyyMmDd(toIsoDateTimeString(this.getNodeParameter('endDate', itemIndex, '')));
	if (!startDate || !endDate) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}
	const pageNum = numberFromAdditional(additionalRaw, 'pageNum', 1);
	const pageSize = numberFromAdditional(additionalRaw, 'pageSize', 20);
	const settlementOrderId = trimStr(additionalRaw.settlementOrderId);

	const rt = await getSettlementRuntime(this);
	const body: SettlementTxnListByDateBody = {
		ipRoleId: rt.merchantId,
		settlementStartTime: dateToIsoStart(startDate),
		settlementEndTime: dateToIsoEnd(endDate),
		pageNum,
		pageSize,
	};
	if (settlementOrderId) body.settlementOrderId = settlementOrderId;

	const functionName = SETTLEMENT_FUNCTION.TXN_LIST_BY_DATE;
	const base = rt.baseUrl.replace(/\/+$/, '');
	const pathAndQuery = `/merchant-adapter/internal/${functionName}?${new URLSearchParams({ mid: rt.merchantId }).toString()}`;
	const fullUrl = new URL(pathAndQuery, `${base}/`).toString();

	const { requestId, outerBody } = buildSettlementOuterEnvelope(rt, { ...body });
	const signature = await generateSignature(outerBody, rt.keySecret);

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
