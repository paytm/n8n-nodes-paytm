import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	type INode,
} from 'n8n-workflow';
import { generateChecksum } from '../client/checksum';
import { PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type {
	InitiateRefundAgentInfo,
	InitiateRefundBody,
	PaytmChecksumApiResponse,
} from '../types';
import { getClient, getBody, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { responseValidation } from '../utils/responseValidationUtil';
import { assertMandatoryNumber, assertMandatoryStrings } from '../utils/fieldValidationUtil';

const INITIATE_REFUND_SHOW = { show: { operation: [Operation.INITIATE_REFUND] } };

const INITIATE_REFUND_ADDITIONAL_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Agent Info',
		name: 'agentInfo',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Refund initiator details',
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'customer@example.com',
			},
			{
				displayName: 'Employee ID',
				name: 'employeeId',
				type: 'string',
				default: '',
				placeholder: 'EMP-001',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Name',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNo',
				type: 'string',
				default: '',
				placeholder: '7777777777',
			},
		],
	},
	{
		displayName: 'Comments',
		name: 'comments',
		type: 'string',
		default: '',
		placeholder: 'Returned goods',
		description: 'Refund reason',
	},
	{
		displayName: 'Disable Merchant Debit Retry',
		name: 'disableMerchantDebitRetry',
		type: 'boolean',
		default: false,
		placeholder: 'Whether to retry refund in case of insufficient merchant MPA balance',
	},
	{
		displayName: 'Refund Items',
		name: 'refundItems',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Refund Item',
		default: {},
		options: [
			{
				displayName: 'Item',
				name: 'item',
				values: [
					{
						displayName: 'Item ID',
						name: 'itemId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Product ID',
						name: 'productId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Add Refund Amount',
						name: 'includeItemRefundAmount',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Item Refund Amount',
						name: 'itemRefundAmount',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								includeItemRefundAmount: [true],
							},
						},
					},
				],
			},
		],
	},
];

function trimStr(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

function buildAgentInfo(raw: IDataObject | undefined): InitiateRefundAgentInfo | undefined {
	if (!raw || Object.keys(raw).length === 0) return undefined;
	const employeeId = trimStr(raw.employeeId);
	const name = trimStr(raw.name);
	const phoneNo = trimStr(raw.phoneNo);
	const email = trimStr(raw.email);
	const out: InitiateRefundAgentInfo = {};
	if (employeeId) out.employeeId = employeeId;
	if (name) out.name = name;
	if (phoneNo) out.phoneNo = phoneNo;
	if (email) out.email = email;
	return Object.keys(out).length > 0 ? out : undefined;
}

function parseRefundItemsJson(value: unknown, node: INode, itemIndex: number): unknown {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') {
		const t = value.trim();
		if (!t) return undefined;
		try {
			return JSON.parse(t) as unknown;
		} catch {
			throw new NodeOperationError(node, 'Refund Items must be valid JSON', { itemIndex });
		}
	}
	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			return value.length > 0 ? value : undefined;
		}
		return Object.keys(value as object).length > 0 ? value : undefined;
	}
	return undefined;
}

function isTruthyParam(val: unknown): boolean {
	if (val === true) return true;
	if (typeof val === 'string') return val.toLowerCase() === 'true';
	return false;
}

/** Optional per-line amount: flat field, or legacy nested / toggle saves. */
function resolveItemRefundAmountForRow(row: IDataObject): string | undefined {
	const block =
		(row.itemRefundAmountEntry as IDataObject | undefined) ??
		(row.refundAmountOptional as IDataObject | undefined);
	if (block && typeof block === 'object' && !Array.isArray(block)) {
		const v = trimStr(block.itemRefundAmount);
		if (v) return v;
	}

	if (Object.prototype.hasOwnProperty.call(row, 'includeItemRefundAmount')) {
		if (!isTruthyParam(row.includeItemRefundAmount)) {
			return undefined;
		}
		return trimStr(row.itemRefundAmount) || undefined;
	}

	return trimStr(row.itemRefundAmount) || undefined;
}

/** Builds Paytm `refundItems` array from fixedCollection rows (`{ item: [...] }`). */
function buildRefundItemsFromFixedCollection(
	rows: IDataObject[],
	node: INode,
	itemIndex: number,
): Array<{ itemId: string; productId: string; itemRefundAmount?: string }> | undefined {
	const out: Array<{ itemId: string; productId: string; itemRefundAmount?: string }> = [];
	for (const row of rows) {
		const itemId = trimStr(row.itemId);
		const productId = trimStr(row.productId);
		if (!itemId && !productId) {
			continue;
		}
		if (!itemId || !productId) {
			throw new NodeOperationError(
				node,
				'Refund Items: each added row must include both Item ID and Product ID.',
				{ itemIndex },
			);
		}
		const entry: { itemId: string; productId: string; itemRefundAmount?: string } = {
			itemId,
			productId,
		};
		const amt = resolveItemRefundAmountForRow(row);
		if (amt) {
			entry.itemRefundAmount = amt;
		}
		out.push(entry);
	}
	return out.length > 0 ? out : undefined;
}

function buildRefundItemsPayload(
	raw: unknown,
	node: INode,
	itemIndex: number,
): unknown | undefined {
	if (raw === undefined || raw === null) return undefined;

	if (typeof raw === 'string') {
		return parseRefundItemsJson(raw, node, itemIndex);
	}

	if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
		const o = raw as IDataObject;
		const itemRows = o.item;
		if (itemRows !== undefined) {
			const rows = Array.isArray(itemRows) ? itemRows : [itemRows as IDataObject];
			return buildRefundItemsFromFixedCollection(rows, node, itemIndex);
		}
	}

	if (Array.isArray(raw)) {
		return raw.length > 0 ? raw : undefined;
	}

	return undefined;
}

export const initiateRefundDescription: INodeProperties[] = [
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		required: true,
		description: 'Order ID for initiating refund',
		placeholder: 'ORDER_1234',
		displayOptions: INITIATE_REFUND_SHOW,
	},
	{
		displayName: 'Transaction ID',
		name: 'txnId',
		type: 'string',
		default: '',
		required: true,
		description: 'Paytm transaction ID for initiating refund',
		displayOptions: INITIATE_REFUND_SHOW,
	},
	{
		displayName: 'Refund Reference ID',
		name: 'refId',
		type: 'string',
		default: '',
		required: true,
		description: 'Merchant unique reference ID for this refund',
		placeholder: 'REFUNDID_1234',
		displayOptions: INITIATE_REFUND_SHOW,
	},
	{
		displayName: 'Transaction Type',
		name: 'txnType',
		type: 'options',
		default: 'REFUND',
		required: true,
		options: [{ name: 'Refund', value: 'REFUND' }],
		displayOptions: INITIATE_REFUND_SHOW,
	},
	{
		displayName: 'Refund Amount',
		name: 'refundAmount',
		type: 'number',
		default: 1,
		required: true,
		typeOptions: { minValue: 0 },
		description: 'Amount less than equal to the order amount to initiate refund',
		placeholder: '1',
		displayOptions: INITIATE_REFUND_SHOW,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Optional: comments, disable debit retry, agent info, refund items (structured rows + optional per-item amount). Empty values are not sent.',
		displayOptions: INITIATE_REFUND_SHOW,
		options: INITIATE_REFUND_ADDITIONAL_OPTIONS,
	},
];

function signingStringForInitiateRefundBody(innerBody: InitiateRefundBody): string {
	return JSON.stringify(innerBody).replace(/\s/g, '');
}

async function generateInitiateRefundSignature(
	innerBody: InitiateRefundBody,
	keySecret: string,
): Promise<string> {
	const signingInput = signingStringForInitiateRefundBody(innerBody);
	return generateChecksum(signingInput, keySecret);
}

function buildInitiateRefundPayload(innerBody: InitiateRefundBody, signature: string): Record<string, unknown> {
	return {
		body: innerBody,
		head: {
			tokenType: 'AES',
			signature,
			channelId: 'WEB',
		},
	};
}

export async function executeInitiateRefund(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const orderId = trimStr(this.getNodeParameter('orderId', itemIndex));
	const txnId = trimStr(this.getNodeParameter('txnId', itemIndex));
	const refId = trimStr(this.getNodeParameter('refId', itemIndex));
	const txnType = this.getNodeParameter('txnType', itemIndex) as string;
	const refundAmount = this.getNodeParameter('refundAmount', itemIndex) as number;

	assertMandatoryStrings(this, itemIndex, orderId, txnId, refId);
	assertMandatoryNumber(this, itemIndex, refundAmount);

	if (txnType !== 'REFUND') {
		throw new NodeOperationError(this.getNode(), 'Transaction type must be REFUND for this API.', {
			itemIndex,
		});
	}

	const additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const client = await getClient(this);
	const mid = creds.merchantId as string;
	const keySecret = String(creds.keySecret ?? '').trim();

	const body: InitiateRefundBody = {
		mid,
		txnType: 'REFUND',
		orderId,
		txnId,
		refId,
		refundAmount: refundAmount.toFixed(2),
	};

	const comments = trimStr(additionalRaw.comments);
	if (comments) {
		body.comments = comments;
	}

	if (additionalRaw.disableMerchantDebitRetry === true) {
		body.disableMerchantDebitRetry = true;
	}

	const agentInfo = buildAgentInfo(additionalRaw.agentInfo as IDataObject | undefined);
	if (agentInfo) {
		body.agentInfo = agentInfo;
	}

	const refundItemsParsed = buildRefundItemsPayload(
		additionalRaw.refundItems,
		this.getNode(),
		itemIndex,
	);
	if (refundItemsParsed !== undefined) {
		body.refundItems = refundItemsParsed;
	}

	const signature = await generateInitiateRefundSignature(body, keySecret);
	const payload = buildInitiateRefundPayload(body, signature);

	const res = (await client.postClientCall({
		body: payload,
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'REFUND_APPLY'),
	})) as PaytmChecksumApiResponse;
	responseValidation(res);
	return getBody(res) ?? res;
}
