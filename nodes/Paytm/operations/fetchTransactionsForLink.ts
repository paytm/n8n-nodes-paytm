import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { generateSignature } from '../client/checksum';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type { FetchTransactionsForLinkBody, PaytmChecksumApiResponse } from '../types';
import { getBody, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { responseValidation } from '../utils/responseValidationUtil';
import { assertMandatoryStrings } from '../utils/fieldValidationUtil';
import { toDdMmYyyySlashIstFromNodeValue } from '../utils/dateParamUtils';

const FETCH_TXN_FOR_LINK_SHOW = { show: { operation: [Operation.FETCH_TRANSACTIONS_FOR_LINK] } };

/** Optional `/link/fetchTransaction` fields — Add Field pattern (boolean shows as toggle). */
const FETCH_TRANSACTIONS_ADDITIONAL_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Search Start Date',
		name: 'searchStartDate',
		type: 'dateTime',
		default: '',
		description:
			'Start date to fetch transactions for this link. Sent to Paytm as DD/MM/YYYY or DD/MM/YYYY HH:MM:SS (IST).',
	},
	{
		displayName: 'Search End Date',
		name: 'searchEndDate',
		type: 'dateTime',
		default: '',
		description:
			'End date to fetch transactions for this link. Sent to Paytm as DD/MM/YYYY or DD/MM/YYYY HH:MM:SS (IST).',
	},
	{
		displayName: 'Fetch All Transactions',
		name: 'fetchAllTxns',
		type: 'boolean',
		default: false,
		description: 'Whether to fetch all transactions done on this payment link',
	},
];

export const fetchTransactionsForLinkDescription: INodeProperties[] = [
	{
		displayName: 'Link ID',
		name: 'linkId',
		type: 'string',
		default: '',
		required: true,
		description: 'Search transactions against a link ID',
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

function buildFetchTransactionsForLinkPayload(
	innerBody: FetchTransactionsForLinkBody,
	signature: string,
): Record<string, unknown> {
	return {
		body: innerBody,
		head: {
			tokenType: 'AES',
			signature,
			channelId: 'WEB',
		},
	};
}

export async function executeFetchTransactionsForLink(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const linkId = trimStr(this.getNodeParameter('linkId', itemIndex));
	assertMandatoryStrings(this, itemIndex, linkId);

	const additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const mid = creds.merchantId as string;
	const keySecret = String(creds.keySecret ?? '').trim();

	const body: FetchTransactionsForLinkBody = { mid, linkId };

	const startFormatted = toDdMmYyyySlashIstFromNodeValue(additionalRaw.searchStartDate).trim();
	if (startFormatted) {
		body.searchStartDate = startFormatted;
	}

	const endFormatted = toDdMmYyyySlashIstFromNodeValue(additionalRaw.searchEndDate).trim();
	if (endFormatted) {
		body.searchEndDate = endFormatted;
	}

	if (additionalRaw.fetchAllTxns === true) {
		body.fetchAllTxns = true;
	}

	const signature = await generateSignature(body, keySecret);
	const payload = buildFetchTransactionsForLinkPayload(body, signature);

	const res = (await this.helpers.httpRequestWithAuthentication.call(this, PAYTM_API_CREDENTIAL_NAME, {
		method: 'POST',
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'PAYMENT_LINK_FETCH_TRANSACTIONS'),
		body: payload,
		json: true,
	})) as PaytmChecksumApiResponse;
	responseValidation(res);
	return getBody(res) ?? res;
}
