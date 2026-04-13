import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { Operation } from '../enums';
import type { FetchTransactionsForLinkBody, PaytmChecksumApiResponse } from '../types';
import { getClient, assertPaytmChecksumResponse, getBody } from '../utils/helpers';
import { assertMandatoryStrings } from '../utils/mandatoryFieldError';
import { normalizeDateTimeParam } from '../utils/dateParamUtils';

const FETCH_TXN_FOR_LINK_SHOW = { show: { operation: [Operation.FETCH_TRANSACTIONS_FOR_LINK] } };

/** Optional `/link/fetchTransaction` fields — Add Field pattern (boolean shows as toggle). */
const FETCH_TRANSACTIONS_ADDITIONAL_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Search Start Date',
		name: 'searchStartDate',
		type: 'dateTime',
		default: '',
		description: 'Start date to fetch transactions for this link',
	},
	{
		displayName: 'Search End Date',
		name: 'searchEndDate',
		type: 'dateTime',
		default: '',
		description: 'End date to fetch transactions for this link',
	},
	{
		displayName: 'Fetch All Transactions',
		name: 'fetchAllTxns',
		type: 'boolean',
		default: false,
		description:
			'Whether to fetch all transactions done on the link',
	},
];

export const fetchTransactionsForLinkDescription: INodeProperties[] = [
	{
		displayName: 'Link ID',
		name: 'linkId',
		type: 'string',
		default: '',
		required: true,
		description: 'Search transactions against a link id',
		placeholder: '123456789',
		displayOptions: FETCH_TXN_FOR_LINK_SHOW,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Same pattern as Create Payment Link: add search dates and/or Fetch All Transactions; empty values are not sent',
		displayOptions: FETCH_TXN_FOR_LINK_SHOW,
		options: FETCH_TRANSACTIONS_ADDITIONAL_OPTIONS,
	},
];

function trimStr(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

export async function executeFetchTransactionsForLink(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const linkId = trimStr(this.getNodeParameter('linkId', itemIndex));
	assertMandatoryStrings(this, itemIndex, linkId);

	const additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;

	const body: FetchTransactionsForLinkBody = { mid, linkId };

	const startIso = normalizeDateTimeParam(additionalRaw.searchStartDate).trim();
	if (startIso) {
		body.searchStartDate = startIso;
	}

	const endIso = normalizeDateTimeParam(additionalRaw.searchEndDate).trim();
	if (endIso) {
		body.searchEndDate = endIso;
	}

	if (additionalRaw.fetchAllTxns === true) {
		body.fetchAllTxns = true;
	}

	const res = (await client.requestWithChecksum(
		'POST',
		'/link/fetchTransaction',
		body,
	)) as PaytmChecksumApiResponse;
	assertPaytmChecksumResponse(res);
	return getBody(res) ?? res;
}
