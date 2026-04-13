import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import { Operation } from '../enums';
import type {
	InitiateSubscriptionBody,
	InitiateSubscriptionUserInfo,
	PaytmChecksumApiBody,
	PaytmChecksumApiResponse,
} from '../types';
import { normalizeDateOnlyParam } from '../utils/dateParamUtils';
import { getClient, assertPaytmChecksumResponse, getBody } from '../utils/helpers';

/**
 * n8n throws "Could not get parameter" for fields hidden by displayOptions (e.g. subscriptionMaxAmount when amount type is FIX).
 * This wrapper turns that into a clearer NodeOperationError naming the parameter.
 */
function readInitiateNodeParameter<T>(
	ctx: IExecuteFunctions,
	itemIndex: number,
	parameterName: string,
	read: () => T,
): T {
	try {
		return read();
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new NodeOperationError(
			ctx.getNode(),
			`Paytm Initiate subscription: n8n could not read parameter "${parameterName}". ` +
				`If you use Fixed amount type, do not map hidden fields. Otherwise open the node, select Subscription → Initiate subscription, and save. (${msg})`,
			{ itemIndex },
		);
	}
}

function todayYmd(): string {
	return new Date().toISOString().slice(0, 10);
}

const INITIATE_SUB_SHOW = { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } };

/** Show optional fields when `initiateOptionalSection` matches (one group at a time). */
function optSectionShow(section: string) {
	return {
		show: {
			operation: [Operation.INITIATE_SUBSCRIPTION],
			initiateOptionalSection: [section],
		},
	};
}

function triStateToOptionalBool(v: unknown): boolean | undefined {
	if (v === '' || v === undefined || v === null) return undefined;
	if (v === true || v === 'true') return true;
	if (v === false || v === 'false') return false;
	return undefined;
}

/** Merge optional Paytm `extendInfo` string fields; omit empty. */
function buildExtendInfo(src: IDataObject): Record<string, string> | undefined {
	const out: Record<string, string> = {};
	for (const key of ['udf1', 'udf2', 'udf3', 'mercUnqRef', 'comments'] as const) {
		const t = trimStr(src[key]);
		if (t) out[key] = t;
	}
	return Object.keys(out).length ? out : undefined;
}

function trimStr(v: unknown): string {
	if (v === undefined || v === null) return '';
	return String(v).trim();
}

export const initiateSubscriptionDescription: INodeProperties[] = [
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. ORDER_001',
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Subscription Amount Type',
		name: 'subscriptionAmountType',
		type: 'options',
		default: 'FIX',
		options: [
			{ name: 'Fixed', value: 'FIX' },
			{ name: 'Variable', value: 'VARIABLE' },
		],
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		required: true,
		description: 'Amount in INR (for FIX, used as renewal amount)',
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Subscription Frequency Unit',
		name: 'subscriptionFrequencyUnit',
		type: 'options',
		default: 'MONTH',
		required: true,
		options: [
			{ name: 'Bi-Monthly', value: 'BI_MONTHLY' },
			{ name: 'Month', value: 'MONTH' },
			{ name: 'On Demand', value: 'ONDEMAND' },
			{ name: 'Quarter', value: 'QUARTER' },
			{ name: 'Semi-Annually', value: 'SEMI_ANNUALLY' },
			{ name: 'Week', value: 'WEEK' },
			{ name: 'Year', value: 'YEAR' },
		],
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Subscription Start Date',
		name: 'subscriptionStartDate',
		type: 'dateTime',
		typeOptions: { dateOnly: true },
		default: '',
		placeholder: 'YYYY-MM-DD (defaults to today if empty)',
		description: 'YYYY-MM-DD; empty defaults to today',
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Subscription Expiry Date',
		name: 'subscriptionExpiryDate',
		type: 'dateTime',
		typeOptions: { dateOnly: true },
		default: '',
		required: true,
		placeholder: 'YYYY-MM-DD',
		description: 'Sent to Paytm as YYYY-MM-DD',
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Customer ID',
		name: 'custId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. CUST_001',
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Website Name',
		name: 'websiteName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. DEFAULT',
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Subscription Enable Retry',
		name: 'subscriptionEnableRetry',
		type: 'options',
		default: '1',
		options: [
			{ name: 'Disable (0)', value: '0' },
			{ name: 'Enable (1)', value: '1' },
		],
		description: 'Per Paytm API: 1 = enable retry on failed collection, 0 = else',
		displayOptions: { show: { operation: [Operation.INITIATE_SUBSCRIPTION] } },
	},
	{
		displayName: 'Subscription Max Amount',
		name: 'subscriptionMaxAmount',
		type: 'string',
		default: '',
		required: true,
		description: 'Required when amount type is VARIABLE',
		displayOptions: {
			show: {
				operation: [Operation.INITIATE_SUBSCRIPTION],
				subscriptionAmountType: ['VARIABLE'],
			},
		},
	},
	{
		displayName: 'Callback URL',
		name: 'callbackUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://your-server.com/callback',
		description:
			'Required. Paytm uses this URL for transaction callbacks. Must be HTTPS in production where applicable',
		displayOptions: INITIATE_SUB_SHOW,
	},
	{
		displayName: 'Optional Parameters',
		name: 'initiateOptionalSection',
		type: 'options',
		default: 'none',
		noDataExpression: true,
		description:
			'Choose an optional group to show and fill. Empty values are not sent. Pick None to hide optional fields',
		options: [
			{ name: 'Additional User Info', value: 'additionalUserInfo' },
			{ name: 'Extend Info', value: 'extendInfo' },
			{ name: 'None', value: 'none' },
			{ name: 'Request Head', value: 'requestHead' },
			{ name: 'SSO Token', value: 'ssoToken' },
			{ name: 'Subscription & Retry', value: 'subscriptionRetry' },
		],
		displayOptions: INITIATE_SUB_SHOW,
	},
	{
		displayName: 'Channel ID',
		name: 'optionalHeadChannelId',
		type: 'options',
		default: '',
		options: [
			{ name: 'Default (Omit)', value: '' },
			{ name: 'WAP', value: 'WAP' },
			{ name: 'WEB', value: 'WEB' },
		],
		description: 'WEB for websites, WAP for mobile web or app',
		displayOptions: optSectionShow('requestHead'),
	},
	{
		displayName: 'Client ID',
		name: 'optionalHeadClientId',
		type: 'string',
		default: '',
		placeholder: 'e.g. C11',
		description: 'Use when the merchant has more than one key',
		displayOptions: optSectionShow('requestHead'),
	},
	{
		displayName: 'Request Timestamp',
		name: 'optionalHeadRequestTimestamp',
		type: 'string',
		default: '',
		placeholder: 'EPOCH seconds',
		description: 'EPOCH time when the request is sent',
		displayOptions: optSectionShow('requestHead'),
	},
	{
		displayName: 'Version',
		name: 'optionalHeadVersion',
		type: 'string',
		default: '',
		placeholder: 'e.g. v1',
		description: 'API version',
		displayOptions: optSectionShow('requestHead'),
	},
	{
		displayName: 'Email',
		name: 'optionalUserEmail',
		type: 'string',
		default: '',
		placeholder: 'e.g. user@example.com',
		displayOptions: optSectionShow('additionalUserInfo'),
	},
	{
		displayName: 'First Name',
		name: 'optionalUserFirstName',
		type: 'string',
		default: '',
		placeholder: 'e.g. John',
		displayOptions: optSectionShow('additionalUserInfo'),
	},
	{
		displayName: 'Last Name',
		name: 'optionalUserLastName',
		type: 'string',
		default: '',
		placeholder: 'e.g. Doe',
		displayOptions: optSectionShow('additionalUserInfo'),
	},
	{
		displayName: 'Mobile',
		name: 'optionalUserMobile',
		type: 'string',
		default: '',
		placeholder: '10-digit mobile',
		description: 'Needed for some pay modes (e.g. Debit Card EMI) per Paytm',
		displayOptions: optSectionShow('additionalUserInfo'),
	},
	{
		displayName: 'Auto Renewal',
		name: 'optionalSubAutoRenewal',
		type: 'options',
		default: '',
		options: [
			{ name: 'Default (Omit)', value: '' },
			{ name: 'False', value: 'false' },
			{ name: 'True', value: 'true' },
		],
		displayOptions: optSectionShow('subscriptionRetry'),
	},
	{
		displayName: 'Auto Retry',
		name: 'optionalSubAutoRetry',
		type: 'options',
		default: '',
		options: [
			{ name: 'Default (Omit)', value: '' },
			{ name: 'False', value: 'false' },
			{ name: 'True', value: 'true' },
		],
		displayOptions: optSectionShow('subscriptionRetry'),
	},
	{
		displayName: 'Communication Manager',
		name: 'optionalSubCommunicationManager',
		type: 'options',
		default: '',
		options: [
			{ name: 'Default (Omit)', value: '' },
			{ name: 'False', value: 'false' },
			{ name: 'True', value: 'true' },
		],
		description: 'Send notifications for subscription events',
		displayOptions: optSectionShow('subscriptionRetry'),
	},
	{
		displayName: 'Subscription Grace Days',
		name: 'optionalSubGraceDays',
		type: 'string',
		default: '',
		placeholder: 'e.g. 0',
		description: 'If set, overrides the default 0',
		displayOptions: optSectionShow('subscriptionRetry'),
	},
	{
		displayName: 'Subscription Retry Count',
		name: 'optionalSubRetryCount',
		type: 'string',
		default: '',
		placeholder: 'e.g. 3',
		displayOptions: optSectionShow('subscriptionRetry'),
	},
	{
		displayName: 'Comments',
		name: 'optionalExtendComments',
		type: 'string',
		default: '',
		displayOptions: optSectionShow('extendInfo'),
	},
	{
		displayName: 'Merchant Unique Reference',
		name: 'optionalExtendMercUnqRef',
		type: 'string',
		default: '',
		placeholder: 'Merchant reference text',
		displayOptions: optSectionShow('extendInfo'),
	},
	{
		displayName: 'UDF 1',
		name: 'optionalExtendUdf1',
		type: 'string',
		default: '',
		displayOptions: optSectionShow('extendInfo'),
	},
	{
		displayName: 'UDF 2',
		name: 'optionalExtendUdf2',
		type: 'string',
		default: '',
		displayOptions: optSectionShow('extendInfo'),
	},
	{
		displayName: 'UDF 3',
		name: 'optionalExtendUdf3',
		type: 'string',
		default: '',
		displayOptions: optSectionShow('extendInfo'),
	},
	{
		displayName: 'Paytm SSO Token',
		name: 'optionalPaytmSsoToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		description: 'Provided when linking user Paytm wallet',
		displayOptions: optSectionShow('ssoToken'),
	},
];

export async function executeInitiateSubscription(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const orderId = readInitiateNodeParameter(this, itemIndex, 'orderId', () =>
		((this.getNodeParameter('orderId', itemIndex) as string) ?? '').trim(),
	);
	const subscriptionAmountType = readInitiateNodeParameter(this, itemIndex, 'subscriptionAmountType', () =>
		this.getNodeParameter('subscriptionAmountType', itemIndex) as string,
	);
	const subscriptionFrequencyUnit = readInitiateNodeParameter(this, itemIndex, 'subscriptionFrequencyUnit', () =>
		((this.getNodeParameter('subscriptionFrequencyUnit', itemIndex) as string) ?? '').trim(),
	);
	const subscriptionExpiryDate = readInitiateNodeParameter(this, itemIndex, 'subscriptionExpiryDate', () =>
		normalizeDateOnlyParam(this.getNodeParameter('subscriptionExpiryDate', itemIndex)).trim(),
	);
	const amountNum = readInitiateNodeParameter(this, itemIndex, 'amount', () =>
		this.getNodeParameter('amount', itemIndex) as number,
	);
	const custId = readInitiateNodeParameter(this, itemIndex, 'custId', () =>
		((this.getNodeParameter('custId', itemIndex) as string) ?? '').trim(),
	);
	const websiteName = readInitiateNodeParameter(this, itemIndex, 'websiteName', () =>
		((this.getNodeParameter('websiteName', itemIndex) as string) ?? '').trim(),
	);
	const callbackUrl = readInitiateNodeParameter(this, itemIndex, 'callbackUrl', () =>
		trimStr(this.getNodeParameter('callbackUrl', itemIndex, '') as string),
	);
	const subscriptionEnableRetry = readInitiateNodeParameter(this, itemIndex, 'subscriptionEnableRetry', () =>
		String(this.getNodeParameter('subscriptionEnableRetry', itemIndex, '1')).trim(),
	);
	// Only present in the workflow when subscriptionAmountType is VARIABLE — never read when FIX.
	const subscriptionMaxAmountRaw =
		subscriptionAmountType === 'VARIABLE'
			? readInitiateNodeParameter(this, itemIndex, 'subscriptionMaxAmount', () =>
					((this.getNodeParameter('subscriptionMaxAmount', itemIndex) as string) ?? '').trim(),
			  )
			: '';
	let subscriptionStartDate = readInitiateNodeParameter(this, itemIndex, 'subscriptionStartDate', () =>
		normalizeDateOnlyParam(this.getNodeParameter('subscriptionStartDate', itemIndex)).trim(),
	);

	const missingFields: string[] = [];
	if (!orderId) missingFields.push('orderId');
	if (!subscriptionFrequencyUnit) missingFields.push('subscriptionFrequencyUnit');
	if (!subscriptionExpiryDate) missingFields.push('subscriptionExpiryDate');
	if (!custId) missingFields.push('custId');
	if (!websiteName) missingFields.push('websiteName');
	if (!callbackUrl) missingFields.push('callbackUrl');

	if (missingFields.length > 0) {
		throw new NodeOperationError(
			this.getNode(),
			`Initiate subscription: missing or empty required field(s): ${missingFields.join(', ')}. Fill these in the node or map them from previous nodes.`,
			{ itemIndex },
		);
	}

	if (subscriptionAmountType === 'VARIABLE' && !subscriptionMaxAmountRaw) {
		throw new NodeOperationError(
			this.getNode(),
			'Subscription max amount is required when subscription amount type is VARIABLE (field: subscriptionMaxAmount).',
			{ itemIndex },
		);
	}
	if (amountNum === undefined || amountNum === null || Number.isNaN(Number(amountNum))) {
		throw new NodeOperationError(this.getNode(), 'A valid amount is required (field: amount).', { itemIndex });
	}

	const amount = Number(amountNum).toFixed(2);
	if (!subscriptionStartDate) {
		subscriptionStartDate = todayYmd();
	}

	const client = await getClient(this);
	const mid = (await this.getCredentials('paytmApi')).merchantId as string;

	const userInfo: InitiateSubscriptionUserInfo = { custId };
	const em = trimStr(this.getNodeParameter('optionalUserEmail', itemIndex, ''));
	if (em) userInfo.email = em;
	const fn = trimStr(this.getNodeParameter('optionalUserFirstName', itemIndex, ''));
	if (fn) userInfo.firstName = fn;
	const ln = trimStr(this.getNodeParameter('optionalUserLastName', itemIndex, ''));
	if (ln) userInfo.lastName = ln;
	const mob = trimStr(this.getNodeParameter('optionalUserMobile', itemIndex, ''));
	if (mob) userInfo.mobile = mob;

	const graceOverride = trimStr(this.getNodeParameter('optionalSubGraceDays', itemIndex, ''));
	const subscriptionGraceDaysFinal = graceOverride || '0';

	const body: InitiateSubscriptionBody = {
		requestType: 'NATIVE_SUBSCRIPTION',
		mid,
		orderId,
		websiteName,
		txnAmount: { value: amount, currency: 'INR' },
		userInfo,
		callbackUrl,
		subscriptionAmountType,
		subscriptionEnableRetry: subscriptionEnableRetry || '1',
		subscriptionFrequencyUnit,
		subscriptionExpiryDate,
		subscriptionStartDate,
		subscriptionGraceDays: subscriptionGraceDaysFinal,
	};

	const retryC = trimStr(this.getNodeParameter('optionalSubRetryCount', itemIndex, ''));
	if (retryC) {
		body.subscriptionRetryCount = retryC;
	}

	const ar = triStateToOptionalBool(this.getNodeParameter('optionalSubAutoRenewal', itemIndex, ''));
	if (ar !== undefined) {
		body.autoRenewal = ar;
	}
	const art = triStateToOptionalBool(this.getNodeParameter('optionalSubAutoRetry', itemIndex, ''));
	if (art !== undefined) {
		body.autoRetry = art;
	}
	const cm = triStateToOptionalBool(this.getNodeParameter('optionalSubCommunicationManager', itemIndex, ''));
	if (cm !== undefined) {
		body.communicationManager = cm;
	}

	const ext = buildExtendInfo({
		comments: trimStr(this.getNodeParameter('optionalExtendComments', itemIndex, '')),
		mercUnqRef: trimStr(this.getNodeParameter('optionalExtendMercUnqRef', itemIndex, '')),
		udf1: trimStr(this.getNodeParameter('optionalExtendUdf1', itemIndex, '')),
		udf2: trimStr(this.getNodeParameter('optionalExtendUdf2', itemIndex, '')),
		udf3: trimStr(this.getNodeParameter('optionalExtendUdf3', itemIndex, '')),
	} as IDataObject);
	if (ext) {
		body.extendInfo = ext;
	}

	const ssoTok = trimStr(this.getNodeParameter('optionalPaytmSsoToken', itemIndex, ''));
	if (ssoTok) {
		body.paytmSsoToken = ssoTok;
	}

	if (subscriptionAmountType === 'FIX') {
		body.renewalAmount = amount;
	}
	if (subscriptionAmountType === 'VARIABLE' && subscriptionMaxAmountRaw) {
		body.subscriptionMaxAmount = subscriptionMaxAmountRaw;
	}

	const headExtra: Record<string, unknown> = {};
	const hClientId = trimStr(this.getNodeParameter('optionalHeadClientId', itemIndex, ''));
	if (hClientId) {
		headExtra.clientId = hClientId;
	}
	const hVersion = trimStr(this.getNodeParameter('optionalHeadVersion', itemIndex, ''));
	if (hVersion) {
		headExtra.version = hVersion;
	}
	const hTs = trimStr(this.getNodeParameter('optionalHeadRequestTimestamp', itemIndex, ''));
	if (hTs) {
		headExtra.requestTimestamp = hTs;
	}
	const hCh = trimStr(this.getNodeParameter('optionalHeadChannelId', itemIndex, ''));
	if (hCh) {
		headExtra.channelId = hCh;
	}
	const headForRequest = Object.keys(headExtra).length ? headExtra : undefined;

	const res = (await client.subscriptionInitiate(
		orderId,
		body as unknown as Record<string, unknown>,
		headForRequest,
	)) as PaytmChecksumApiResponse;

	assertPaytmChecksumResponse(res);
	const inner = getBody(res) as PaytmChecksumApiBody | undefined;
	return inner ?? res;
}
