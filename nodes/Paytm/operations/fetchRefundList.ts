import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
import { generateChecksum } from '../client/checksum';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type { FetchRefundListBody, FetchRefundListRawResponse } from '../types';
import { getClient, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { toIsoDateTimeString, toYyyyMmDdThhMmSsPlus0530 } from '../utils/dateParamUtils';
import { MANDATORY_FIELDS_ERROR_MESSAGE } from '../utils/fieldValidationUtil';

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
		default: 1,
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

function signingStringForFetchRefundListBody(innerBody: FetchRefundListBody): string {
	return JSON.stringify(innerBody).replace(/\s/g, '');
}

async function generateFetchRefundListSignature(
	innerBody: FetchRefundListBody,
	keySecret: string,
): Promise<string> {
	const signingInput = signingStringForFetchRefundListBody(innerBody);
	return generateChecksum(signingInput, keySecret);
}

function buildFetchRefundListPayload(innerBody: FetchRefundListBody, signature: string): Record<string, unknown> {
	return {
		body: innerBody,
		head: {
			tokenType: 'AES',
			signature,
			channelId: 'WEB',
		},
	};
}

export async function executeFetchRefundList(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const startDate = toYyyyMmDdThhMmSsPlus0530(
		toIsoDateTimeString(this.getNodeParameter('startDate', itemIndex)),
	);
	const endDate = toYyyyMmDdThhMmSsPlus0530(
		toIsoDateTimeString(this.getNodeParameter('endDate', itemIndex)),
	);
	if (!startDate || !endDate) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}
	const isSort = this.getNodeParameter('isSort', itemIndex) as boolean;
	const pageNumber = this.getNodeParameter('pageNumber', itemIndex) as number;
	const pageSize = this.getNodeParameter('pageSize', itemIndex) as number;
	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const client = await getClient(this);
	const mid = creds.merchantId as string;
	const keySecret = String(creds.keySecret ?? '').trim();
	const body: FetchRefundListBody = {
		mid,
		isSort,
		startDate,
		endDate,
		pageNum: pageNumber,
		pageSize,
	};
	const signature = await generateFetchRefundListSignature(body, keySecret);
	const payload = buildFetchRefundListPayload(body, signature);

	const res = (await client.postClientCall({
		body: payload,
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'REFUND_PASSBOOK_LIST'),
	})) as FetchRefundListRawResponse;
	const status = res.status;
	if (status !== 'SUCCESS') {
		const errMsg = res.errorMessage || 'Failed to fetch refund list';
		throw new Error(errMsg);
	}
	return res;
}
