import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { Operation } from '../enums';
import type { FetchRefundListBody, FetchRefundListRawResponse } from '../types';
import { getClient } from '../utils/helpers';
import { formatPaytmPassbookDateTime, normalizeDateTimeParam } from '../utils/dateParamUtils';
import { MANDATORY_FIELDS_ERROR_MESSAGE } from '../utils/mandatoryFieldError';

export const fetchRefundListDescription: INodeProperties[] = [
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Start of the range (use the calendar). Maximum range is 30 days with End Date. Sent as India time +05:30.',
		displayOptions: { show: { operation: [Operation.FETCH_REFUND_LIST] } },
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'End of the range (use the calendar). Sent as India time YYYY-MM-DDTHH:mm:ss+05:30 (Paytm passbook format).',
		displayOptions: { show: { operation: [Operation.FETCH_REFUND_LIST] } },
	},
	{
		displayName: 'Page Number',
		name: 'pageNumber',
		type: 'number',
		default: 2,
		description: 'Number of pages to fetch',
		displayOptions: { show: { operation: [Operation.FETCH_REFUND_LIST] } },
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 20,
		description: 'Numbers of refunds to fetch in one iteration',
		displayOptions: { show: { operation: [Operation.FETCH_REFUND_LIST] } },
	},
	{
		displayName: 'Sort By Date',
		name: 'isSort',
		type: 'boolean',
		default: true,
		description: 'Whether to sort results by refund date',
		displayOptions: { show: { operation: [Operation.FETCH_REFUND_LIST] } },
	},
];

export async function executeFetchRefundList(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const startDate = formatPaytmPassbookDateTime(
		normalizeDateTimeParam(this.getNodeParameter('startDate', itemIndex)),
	);
	const endDate = formatPaytmPassbookDateTime(
		normalizeDateTimeParam(this.getNodeParameter('endDate', itemIndex)),
	);
	if (!startDate || !endDate) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}
	const isSort = this.getNodeParameter('isSort', itemIndex) as boolean;
	const pageNumber = this.getNodeParameter('pageNumber', itemIndex) as number;
	const pageSize = this.getNodeParameter('pageSize', itemIndex) as number;
	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;
	const body: FetchRefundListBody = {
		mid,
		isSort,
		startDate,
		endDate,
		pageNum: pageNumber,
		pageSize,
	};
	const res = (await client.requestWithChecksum(
		'POST',
		'/merchant-passbook/api/v1/refundList',
		body,
	)) as FetchRefundListRawResponse;
	const status = res.status;
	if (status !== 'SUCCESS') {
		const errMsg = res.errorMessage || 'Failed to fetch refund list';
		throw new Error(errMsg);
	}
	return res;
}
