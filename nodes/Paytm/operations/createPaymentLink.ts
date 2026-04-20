import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INode,
	type INodeProperties,
} from 'n8n-workflow';
import { generateSignature } from '../client/checksum';
import { PARAM_PLACEHOLDER_URLS, PAYTM_API_CREDENTIAL_NAME } from '../constants';
import { Operation } from '../enums';
import type {
	CreatePaymentLinkBody,
	CreatePaymentLinkCustomerContact,
	PaytmChecksumApiResponse,
} from '../types';
import { getBody, resolvePaytmSecureApiUrl } from '../utils/credentialUtil';
import { responseValidation } from '../utils/responseValidationUtil';
import { toDdMmYyyyWithOptionalTime } from '../utils/dateParamUtils';
import { MANDATORY_FIELDS_ERROR_MESSAGE } from '../utils/fieldValidationUtil';

const LINK_NAME_MAX_LEN = 64;
const LINK_DESCRIPTION_MAX_LEN = 30;

const CREATE_LINK_ONLY = { show: { operation: [Operation.CREATE_PAYMENT_LINK] } };

function trimStr(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

function parseBoolFromOptionalValue(
	valStr: string,
	fieldLabel: string,
	node: INode,
	itemIndex: number,
): boolean {
	const s = valStr.trim().toLowerCase();
	if (s === 'true' || s === '1' || s === 'yes') return true;
	if (s === 'false' || s === '0' || s === 'no') return false;
	throw new NodeOperationError(
		node,
		`Optional field "${fieldLabel}": use true or false (or 1/0, yes/no) for the value.`,
		{ itemIndex },
	);
}

function applyOptionalLinkFieldsCollection(
	body: CreatePaymentLinkBody,
	raw: IDataObject,
	node: INode,
	itemIndex: number,
): void {
	const merchantRequestId = trimStr(raw.merchantRequestId);
	if (merchantRequestId) body.merchantRequestId = merchantRequestId;

	const customerId = trimStr(raw.customerId);
	if (customerId) body.customerId = customerId;

	const statusCallbackUrl = trimStr(raw.statusCallbackUrl);
	if (statusCallbackUrl) body.statusCallbackUrl = statusCallbackUrl;

	const maxPaymentsAllowed = trimStr(raw.maxPaymentsAllowed);
	if (maxPaymentsAllowed) body.maxPaymentsAllowed = maxPaymentsAllowed;

	const linkNotes = trimStr(raw.linkNotes);
	if (linkNotes) body.linkNotes = linkNotes;

	const resellerId = trimStr(raw.resellerId);
	if (resellerId) body.resellerId = resellerId;

	const customPaymentSuccessMessage = trimStr(raw.customPaymentSuccessMessage);
	if (customPaymentSuccessMessage) body.customPaymentSuccessMessage = customPaymentSuccessMessage;

	const linkOrderId = trimStr(raw.linkOrderId);
	if (linkOrderId) body.linkOrderId = linkOrderId;

	const singleTransactionOnlyRaw = raw.singleTransactionOnly;
	if (typeof singleTransactionOnlyRaw === 'boolean') {
		body.singleTransactionOnly = singleTransactionOnlyRaw ? 'true' : 'false';
	} else {
		const singleTransactionOnly = trimStr(singleTransactionOnlyRaw);
		if (singleTransactionOnly) {
			const parsed = parseBoolFromOptionalValue(
				singleTransactionOnly,
				'Single Transaction Only',
				node,
				itemIndex,
			);
			body.singleTransactionOnly = parsed ? 'true' : 'false';
		}
	}

	const exp = toDdMmYyyyWithOptionalTime(raw.expiryDate);
	if (exp) body.expiryDate = exp;
}

/**
 * Shared optional `/link/create` fields (no Amount — Fixed uses top-level Amount).
 * n8n must not use `displayOptions` on child params inside `collection`; use a
 * separate parent collection for Generic (with optional Amount) instead.
 */
const OPTIONAL_LINK_COLLECTION_OPTIONS_COMMON: INodeProperties[] = [
	{
		displayName: 'Customer Details',
		name: 'customerDetails',
		type: 'collection',
		placeholder: 'Add Customer Details',
		default: {},
		options: [
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
				placeholder: 'customer@example.com',
				description: 'Email ID of the customer to send payment link',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'CUST_001',
			},
			{
				displayName: 'Customer Mobile',
				name: 'customerMobile',
				type: 'string',
				default: '',
				placeholder: '9876543210',
				description: 'Mobile number of the customer to send payment link',
			},
			{
				displayName: 'Customer Name',
				name: 'customerName',
				type: 'string',
				default: '',
				placeholder: 'John Doe',
			},
		],
	},
	{
		displayName: 'Expiry Date',
		name: 'expiryDate',
		type: 'dateTime',
		default: '',
		description: 'Link expiry date',
	},
	{
		displayName: 'Link Notes',
		name: 'linkNotes',
		type: 'string',
		default: '',
		placeholder: 'Internal reference',
		description: 'Additional payment link notes, not shown to customer',
	},
	{
		displayName: 'Link Order ID',
		name: 'linkOrderId',
		type: 'string',
		default: '',
		placeholder: 'ORDER_123',
		description: 'Unique reference ID to be used for recon',
	},
	{
		displayName: 'Max Payments Allowed',
		name: 'maxPaymentsAllowed',
		type: 'string',
		default: '',
		placeholder: '1',
		description: 'Max number of payments allowed for this link',
	},
	{
		displayName: 'Merchant Request ID',
		name: 'merchantRequestId',
		type: 'string',
		default: '',
		placeholder: 'unique-request-ID',
		description: 'Unique ID to be generated by merchant',
	},
	{
		displayName: 'Payment Success Message',
		name: 'customPaymentSuccessMessage',
		type: 'string',
		default: '',
		placeholder: 'Thank you for your payment',
		description: 'Display message after payment is successful',
	},
	{
		displayName: 'Reseller ID',
		name: 'resellerId',
		type: 'string',
		default: '',
		placeholder: 'reseller reference',
		description: 'Applicable for reseller (reseller ID is shared during onboarding)',
	},
	{
		displayName: 'Single Transaction Only',
		name: 'singleTransactionOnly',
		type: 'boolean',
		default: false,
		description: 'Whether to allow only single transaction on this payment link',
	},
	{
		displayName: 'Status Callback URL',
		name: 'statusCallbackUrl',
		type: 'string',
		default: '',
		placeholder: PARAM_PLACEHOLDER_URLS.CALLBACK_EXAMPLE,
		description: 'Callback URL to post the transaction status',
	},
];

/** Generic links only: optional preset amount plus shared fields. */
const OPTIONAL_LINK_COLLECTION_OPTIONS_GENERIC: INodeProperties[] = [
	{
		displayName: 'Amount',
		name: 'genericAmount',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 0,
	},
	...OPTIONAL_LINK_COLLECTION_OPTIONS_COMMON,
];

const CREATE_LINK_ADDITIONAL_FIXED_SHOW = {
	show: {
		operation: [Operation.CREATE_PAYMENT_LINK],
		linkType: ['FIXED'],
	},
};

const CREATE_LINK_ADDITIONAL_GENERIC_SHOW = {
	show: {
		operation: [Operation.CREATE_PAYMENT_LINK],
		linkType: ['GENERIC'],
	},
};

export const createPaymentLinkDescription: INodeProperties[] = [
	{
		displayName: 'Link Type',
		name: 'linkType',
		type: 'options',
		default: 'FIXED',
		options: [
			{
				name: 'Fixed',
				value: 'FIXED',
				description: 'Payment link with fixed amount',
			},
			{
				name: 'Generic',
				value: 'GENERIC',
				description: 'Payment link with no preset amount',
			},
		],
		displayOptions: CREATE_LINK_ONLY,
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: undefined,
		required: true,
		placeholder: 'Txn amount in rupees',
		displayOptions: {
			show: {
				operation: [Operation.CREATE_PAYMENT_LINK],
				linkType: ['FIXED'],
			},
		},
	},
	{
		displayName: 'Link Name',
		name: 'linkName',
		type: 'string',
		default: '',
		required: true,
		description: 'Link label to display to customer',
		displayOptions: CREATE_LINK_ONLY,
	},
	{
		displayName: 'Link Description',
		name: 'linkDescription',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Max 30 chars',
		description: 'Link description to display to customer',
		displayOptions: CREATE_LINK_ONLY,
	},
	{
		displayName: 'Partial Payment',
		name: 'partialPayment',
		type: 'boolean',
		default: false,
		description: 'Whether to allow payment in parts',
		displayOptions: CREATE_LINK_ONLY,
	},
	{
		displayName: 'Bind Link ID Mobile',
		name: 'bindLinkIdMobile',
		type: 'boolean',
		default: false,
		description: 'Whether to bind payment to a mobile number',
		displayOptions: CREATE_LINK_ONLY,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsFixed',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Optional fields for fixed-amount links (no Amount here — use Amount above). Same pattern as Customer Details: open the section to see fields; fill only what you need. Empty values are not sent',
		displayOptions: CREATE_LINK_ADDITIONAL_FIXED_SHOW,
		options: OPTIONAL_LINK_COLLECTION_OPTIONS_COMMON,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Optional fields for generic links (includes optional Amount). Same pattern as Customer Details: open the section to see fields; fill only what you need. Empty values are not sent',
		displayOptions: CREATE_LINK_ADDITIONAL_GENERIC_SHOW,
		options: OPTIONAL_LINK_COLLECTION_OPTIONS_GENERIC,
	},
];

function buildCreatePaymentLinkPayload(
	innerBody: CreatePaymentLinkBody,
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

export async function executeCreatePaymentLink(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const linkNameRaw = (this.getNodeParameter('linkName', itemIndex) as string)?.trim();
	const linkDescriptionRaw = (
		this.getNodeParameter('linkDescription', itemIndex) as string
	)?.trim();

	if (!linkNameRaw) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}
	if (linkNameRaw.length > LINK_NAME_MAX_LEN) {
		throw new NodeOperationError(
			this.getNode(),
			`Link Name must be at most ${LINK_NAME_MAX_LEN} characters (Paytm API limit).`,
			{ itemIndex },
		);
	}
	if (!linkDescriptionRaw) {
		throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}
	if (linkDescriptionRaw.length > LINK_DESCRIPTION_MAX_LEN) {
		throw new NodeOperationError(
			this.getNode(),
			`Link Description must be at most ${LINK_DESCRIPTION_MAX_LEN} characters (Paytm API limit).`,
			{ itemIndex },
		);
	}

	const linkType = this.getNodeParameter(
		'linkType',
		itemIndex,
	) as CreatePaymentLinkBody['linkType'];
	const partialPaymentRaw = this.getNodeParameter('partialPayment', itemIndex) as boolean | string;
	const partialPayment =
		partialPaymentRaw === true ||
		(typeof partialPaymentRaw === 'string' && partialPaymentRaw.toLowerCase() === 'true');
	const bindLinkIdMobile = this.getNodeParameter('bindLinkIdMobile', itemIndex) as boolean;

	let additionalRaw: IDataObject;
	if (linkType === 'GENERIC') {
		additionalRaw = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
	} else {
		const fromFixedOnly = this.getNodeParameter(
			'additionalFieldsFixed',
			itemIndex,
			{},
		) as IDataObject;
		let legacyAdditional: IDataObject = {};
		try {
			legacyAdditional = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
		} catch {
			/* Older fixed-link workflows stored optional fields under `additionalFields` before the split */
		}
		additionalRaw = { ...legacyAdditional, ...fromFixedOnly };
	}
	const detailPack =
		(additionalRaw.customerDetails as IDataObject | undefined) ??
		(additionalRaw.customerDetail as IDataObject | undefined) ??
		(additionalRaw.customerContact as IDataObject | undefined);
	const recipientName = trimStr(detailPack?.customerName);
	const customerEmail = trimStr(detailPack?.customerEmail) || undefined;
	const customerMobile = trimStr(detailPack?.customerMobile) || undefined;

	const customerContact: CreatePaymentLinkCustomerContact = {};
	if (recipientName) customerContact.customerName = recipientName;
	if (customerEmail) customerContact.customerEmail = customerEmail;
	if (customerMobile) customerContact.customerMobile = customerMobile;

	const body: CreatePaymentLinkBody = {
		mid: '',
		linkName: linkNameRaw,
		linkDescription: linkDescriptionRaw,
		linkType,
		maxPaymentsAllowed: 1,
		partialPayment: partialPayment ? 'true' : 'false',
		bindLinkIdMobile,
	};

	if (Object.keys(customerContact).length > 0) {
		body.customerContact = customerContact;
	}

	const creds = await this.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const keySecret = String(creds.keySecret ?? '').trim();
	body.mid = creds.merchantId as string;
	applyOptionalLinkFieldsCollection(body, additionalRaw, this.getNode(), itemIndex);

	body.sendEmail = Boolean(customerEmail);
	body.sendSms = Boolean(customerMobile);

	if (linkType === 'FIXED') {
		const amountTop = this.getNodeParameter('amount', itemIndex) as number | undefined;
		if (amountTop == null || Number.isNaN(amountTop) || amountTop <= 0) {
			throw new NodeOperationError(this.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
		}
		body.amount = amountTop;
	} else if (linkType === 'GENERIC') {
		const fromGenericField = additionalRaw.genericAmount as number | undefined;
		const fromLegacyKey = additionalRaw.amount as number | undefined;
		let amountOpt: number | undefined;
		if (fromGenericField != null && fromGenericField > 0) {
			amountOpt = fromGenericField;
		} else if (fromLegacyKey != null && fromLegacyKey > 0) {
			amountOpt = fromLegacyKey;
		}
		if (amountOpt != null) {
			body.amount = amountOpt;
		}
	}

	const signature = await generateSignature(body, keySecret);
	const payload = buildCreatePaymentLinkPayload(body, signature);

	const res = (await this.helpers.httpRequestWithAuthentication.call(this, PAYTM_API_CREDENTIAL_NAME, {
		method: 'POST',
		url: resolvePaytmSecureApiUrl(creds.environment as string | undefined, 'PAYMENT_LINK_CREATE'),
		body: payload,
		json: true,
	})) as PaytmChecksumApiResponse;
	responseValidation(res);
	return getBody(res) ?? res;
}
