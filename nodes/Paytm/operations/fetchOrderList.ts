import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import { Operation } from '../enums';
import type { FetchOrderListBody, PaytmChecksumApiResponse } from '../types';
import { getClient, assertPaytmChecksumResponse, getBody } from '../utils/helpers';
import { formatPaytmPassbookDateTime, normalizeDateTimeParam } from '../utils/dateParamUtils';
import { MANDATORY_FIELDS_ERROR_MESSAGE } from '../utils/mandatoryFieldError';

const FETCH_ORDER_LIST_SHOW = { show: { operation: [Operation.FETCH_ORDER_LIST] } };

/** Paytm passbook: multiple statuses in one request (pipe-separated). API does not accept literal ALL. */
const ORDER_STATUS_ALL_PIPE = 'SUCCESS|FAILURE|PENDING';

/** Optional `/merchant-passbook/search/list/order/v2` filters — Add Field pattern. */
const FETCH_ORDER_LIST_ADDITIONAL_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Merchant Order ID',
		name: 'merchantOrderId',
		type: 'string',
		default: '',
		placeholder: 'ORDER_1234',
		description: 'Fetch orders against merchant-generated order ID',
	},
	{
		displayName: 'Pay Mode',
		name: 'payMode',
		type: 'string',
		default: '',
		placeholder: 'UPI',
		description: 'Fetch orders against payment option used to pay',
	},
];

function trimStr(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

/**
 * Pipe-separated CAPS values per Paytm. If `ALL` is selected (alone or among picks), send `ALL` only.
 */
function buildOrderSearchType(selected: string[] | undefined): string {
	const s = (Array.isArray(selected) ? selected : []).filter((x) => x != null && String(x).trim() !== '');
	if (s.length === 0 || s.includes('ALL')) {
		return 'ALL';
	}
	return s.join('|');
}

export const fetchOrderListDescription: INodeProperties[] = [
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'Start date to fetch orders',
		displayOptions: FETCH_ORDER_LIST_SHOW,
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'End date to fetch orders',
		displayOptions: FETCH_ORDER_LIST_SHOW,
	},
	{
		displayName: 'Order Search Type',
		name: 'orderSearchType',
		type: 'multiOptions',
		options: [
			{ name: 'All', value: 'ALL' },
			{ name: 'Cancel', value: 'CANCEL' },
			{ name: 'Chargeback', value: 'CHARGEBACK' },
			{ name: 'M2B', value: 'M2B' },
			{ name: 'Refund', value: 'REFUND' },
			{ name: 'Repayment', value: 'REPAYMENT' },
			{ name: 'Transaction', value: 'TRANSACTION' },
			{ name: 'Transfer For Settlement', value: 'TRANSFER_FOR_SETTLEMENT' },
			{ name: 'Transfer To Bank', value: 'TRANSFER_TO_BANK' },
		],
		default: ['ALL'],
		description:
			'Type of transaction to fetch (pipe separated)',
		displayOptions: FETCH_ORDER_LIST_SHOW,
	},
	{
		displayName: 'Order Search Status',
		name: 'orderSearchStatus',
		type: 'options',
		default: 'SUCCESS',
		options: [
			{ name: 'All', value: 'ALL' },
			{ name: 'Failure', value: 'FAILURE' },
			{ name: 'Pending', value: 'PENDING' },
			{ name: 'Success', value: 'SUCCESS' },
		],
		description: 'Fetch orders based on status',
		displayOptions: FETCH_ORDER_LIST_SHOW,
	},
	{
		displayName: 'Page Number',
		name: 'pageNumber',
		type: 'number',
		default: 1,
		description: 'Number of pages to fetch with total page size',
		displayOptions: FETCH_ORDER_LIST_SHOW,
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 20,
		description: 'Numbers of orders to fetch in one iteration',
		displayOptions: FETCH_ORDER_LIST_SHOW,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Optional filters: merchant order ID and/or pay mode. Empty values are not sent.',
		displayOptions: FETCH_ORDER_LIST_SHOW,
		options: FETCH_ORDER_LIST_ADDITIONAL_OPTIONS,
	},
];

export async function executeFetchOrderList(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const startRaw = normalizeDateTimeParam(this.getNodeParameter('startDate', itemIndex));
	const endRaw = normalizeDateTimeParam(this.getNodeParameter('endDate', itemIndex));
	const hasStart = Boolean(startRaw?.trim());
	const hasEnd = Boolean(endRaw?.trim());

	if (!hasStart || !hasEnd) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}

	const fromDate = formatPaytmPassbookDateTime(startRaw);
	const toDate = formatPaytmPassbookDateTime(endRaw);

	if (!fromDate || !toDate) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}

	const typeSelected = this.getNodeParameter('orderSearchType', itemIndex) as string[];
	const orderSearchType = buildOrderSearchType(typeSelected);

	const statusChoice = this.getNodeParameter('orderSearchStatus', itemIndex) as string;
	const orderSearchStatus =
		statusChoice === 'ALL' ? ORDER_STATUS_ALL_PIPE : statusChoice;

	const pageNumber = this.getNodeParameter('pageNumber', itemIndex) as number;
	const pageSize = this.getNodeParameter('pageSize', itemIndex) as number;

	const additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;
	const body: FetchOrderListBody = {
		mid,
		fromDate,
		toDate,
		orderSearchType,
		orderSearchStatus,
		pageNumber,
		pageSize,
		isSort: true,
	};

	const merchantOrderId = trimStr(additionalRaw.merchantOrderId);
	if (merchantOrderId) {
		body.merchantOrderId = merchantOrderId;
	}

	const payMode = trimStr(additionalRaw.payMode);
	if (payMode) {
		body.payMode = payMode;
	}

	const res = (await client.requestWithChecksum(
		'POST',
		'/merchant-passbook/search/list/order/v2',
		body,
	)) as PaytmChecksumApiResponse;
	assertPaytmChecksumResponse(res);
	return getBody(res) ?? res;
}
