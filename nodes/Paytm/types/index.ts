/**
 * Paytm Payments / Refund / Subscription / RTDD — TypeScript shapes derived from this node’s UI fields
 * and request bodies as implemented in operations/. API responses are partially typed
 * where the code reads them; additional fields are open-ended.
 */

import type { IDataObject } from 'n8n-workflow';

// =================
// CREDENTIALS
// =================

export interface PaytmCredentials {
	merchantId: string;
	keySecret: string;
	environment?: 'production' | 'test' | string;
	/** Settlement wrapper base URL; empty uses node default (localhost:8080). */
	merchantAdapterBaseUrl?: string;
}

// =================
// CHECKSUM API — COMMON
// =================

/** Typical `body.resultInfo` on secure.paytmpayments.com JSON responses. */
export interface PaytmResultInfo {
	resultStatus?: string;
	resultMsg?: string;
	resultCode?: string;
	[key: string]: unknown;
}

/** Inner `body` object for checksum APIs (before unwrapping with `getBody`). */
export interface PaytmChecksumApiBody {
	resultInfo?: PaytmResultInfo;
	[key: string]: unknown;
}

/** Parsed top-level JSON for most checksum POSTs (structure varies by endpoint). */
export interface PaytmChecksumApiResponse {
	body?: PaytmChecksumApiBody;
	[key: string]: unknown;
}

// =================
// PAYMENTS — NODE INPUT (UI → execute)
// =================

export interface FetchOrderListNodeParams {
	startDate: unknown;
	endDate: unknown;
	/** Selected types (CAPS); joined with `|` for API, or `ALL`. */
	orderSearchType: string[];
	/** UI `ALL` maps to pipe-separated statuses in the request body. */
	orderSearchStatus: 'ALL' | 'SUCCESS' | 'FAILURE' | 'PENDING' | string;
	pageNumber: number;
	pageSize: number;
	additionalFields?: IDataObject;
}

export interface FetchTransactionsForLinkNodeParams {
	linkId: string;
	/** Optional: date range and fetch-all flag (`/link/fetchTransaction`) */
	additionalFields?: IDataObject;
}

/** Fetch Link (`/link/fetch`) — optional filters live under `additionalFields` (Add Field); `mid` from credentials only. */
export interface FetchPaymentLinksNodeParams {
	additionalFields?: IDataObject;
}

/** Create Link node parameters (core fields + optional `/link/create` keys in a collection). */
export interface CreatePaymentLinkNodeParams {
	linkName: string;
	linkDescription: string;
	linkType: 'FIXED' | 'GENERIC';
	amount: number | undefined;
	partialPayment: boolean;
	bindLinkIdMobile: boolean;
	/** Nested Customer Details (`customerDetails`; legacy `customerDetail` / `customerContact` still read) and other optional keys */
	additionalFields?: IDataObject;
}

// =================
// PAYMENTS — REQUEST BODIES (checksum `body` only)
// =================

export interface FetchOrderListBody {
	mid: string;
	fromDate: string;
	toDate: string;
	orderSearchType: string;
	orderSearchStatus: string;
	pageNumber: number;
	pageSize: number;
	isSort: boolean;
	merchantOrderId?: string;
	payMode?: string;
}

export interface FetchTransactionsForLinkBody {
	mid: string;
	linkId: string;
	searchStartDate?: string;
	searchEndDate?: string;
	fetchAllTxns?: boolean;
}

/** Date strings as `DD/MM/YYYY` or `DD/MM/YYYY HH:MM:SS` (IST) for Paytm `/link/fetch`. */
export interface FetchPaymentLinksSearchFilter {
	fromDate?: string;
	toDate?: string;
	isActive?: boolean;
}

export interface FetchPaymentLinksBody {
	mid: string;
	merchantRequestId?: string;
	linkId?: number | string;
	searchFilterRequestBody?: FetchPaymentLinksSearchFilter;
	linkTypeMultiple?: string[];
	customerName?: string;
	customerPhone?: string;
	customerEmail?: string;
	paymentStatus?: string;
	resellerId?: string;
	resellerName?: string;
}

/** Only non-empty fields should be sent; omit empty optional keys entirely. */
export interface CreatePaymentLinkCustomerContact {
	customerName?: string;
	customerEmail?: string;
	customerMobile?: string;
}

/** Create Link API body (`/link/create`) — core + optional fields per Paytm docs. */
export interface CreatePaymentLinkBody {
	mid: string;
	linkName: string;
	linkDescription: string;
	linkType: 'FIXED' | 'GENERIC';
	/** Present when SMS is enabled (mobile or explicit flag). */
	sendSms?: boolean;
	/** Present when email is enabled (email or explicit flag). */
	sendEmail?: boolean;
	/** Doc: string; node defaults to `1` when not overridden in Optional. */
	maxPaymentsAllowed: number | string;
	customerContact?: CreatePaymentLinkCustomerContact;
	partialPayment: string;
	bindLinkIdMobile: boolean;
	amount?: number;
	merchantRequestId?: string;
	customerId?: string;
	statusCallbackUrl?: string;
	templateId?: string;
	linkNotes?: string;
	invoiceId?: string;
	expiryDate?: string;
	invoicePhoneNo?: string;
	invoiceEmail?: string;
	invoiceDetails?: unknown;
	resellerId?: string;
	splitSettlementInfo?: unknown;
	extendInfo?: string;
	customPaymentSuccessMessage?: string;
	redirectionUrlSuccess?: string;
	redirectionUrlFailure?: string;
	simplifiedSubvention?: unknown;
	simplifiedPaymentOffers?: unknown;
	cartDetails?: unknown;
	linkOrderId?: string;
	/** API expects string "true" / "false" in the JSON body. */
	singleTransactionOnly?: string;
}

// =================
// REFUND — NODE INPUT
// =================

export interface FetchRefundListNodeParams {
	startDate: unknown;
	endDate: unknown;
	isSort: boolean;
	pageNumber: number;
	pageSize: number;
}

export interface CheckRefundStatusNodeParams {
	orderId: string;
	refId: string;
}

export interface InitiateRefundNodeParams {
	orderId: string;
	txnId: string;
	refId: string;
	txnType: 'REFUND' | string;
	refundAmount: number;
	additionalFields?: IDataObject;
}

// =================
// REFUND — REQUEST BODIES
// =================

export interface FetchRefundListBody {
	mid: string;
	isSort: boolean;
	startDate: string;
	endDate: string;
	pageNum: number;
	pageSize: number;
}

export interface CheckRefundStatusBody {
	mid: string;
	orderId: string;
	refId: string;
}

export interface InitiateRefundAgentInfo {
	employeeId?: string;
	name?: string;
	phoneNo?: string;
	email?: string;
}

export interface InitiateRefundBody {
	mid: string;
	txnType: 'REFUND';
	orderId: string;
	txnId: string;
	refId: string;
	/** Two-decimal string as sent by the node. */
	refundAmount: string;
	comments?: string;
	/** API name; spreadsheet “disableMerchantPay”. */
	disableMerchantDebitRetry?: boolean;
	agentInfo?: InitiateRefundAgentInfo;
	refundItems?: unknown;
}

// =================
// SUBSCRIPTION — REQUEST BODIES (checksum `body` only; initiate uses signature-only head)
// =================

/** `userInfo` for Initiate Subscription (custId required; rest per Paytm API). */
export interface InitiateSubscriptionUserInfo {
	custId: string;
	mobile?: string;
	email?: string;
	firstName?: string;
	lastName?: string;
}

/** Inner body for POST /subscription/create (`requestType` NATIVE_SUBSCRIPTION). */
export interface InitiateSubscriptionBody {
	requestType: 'NATIVE_SUBSCRIPTION';
	mid: string;
	orderId: string;
	websiteName: string;
	txnAmount: { value: string; currency: 'INR' };
	userInfo: InitiateSubscriptionUserInfo;
	/** Transaction callback URL (required in node UI). */
	callbackUrl: string;
	subscriptionAmountType: string;
	subscriptionEnableRetry: string;
	subscriptionFrequencyUnit: string;
	subscriptionExpiryDate: string;
	subscriptionStartDate?: string;
	subscriptionGraceDays?: string;
	renewalAmount?: string;
	subscriptionMaxAmount?: string;
	paytmSsoToken?: string;
	autoRenewal?: boolean;
	autoRetry?: boolean;
	communicationManager?: boolean;
	subscriptionRetryCount?: string;
	extendInfo?: Record<string, string>;
}

export interface CancelSubscriptionBody {
	mid: string;
	subsId: string;
}

export interface PauseResumeSubscriptionBody {
	mid: string;
	subsId: string;
	status: 'SUSPENDED' | 'ACTIVE';
}

export interface FetchSubscriptionStatusBody {
	mid: string;
	subsId?: string;
	orderId?: string;
	custId?: string;
	linkId?: string;
}

/** Passbook refund list returns top-level `status` / `errorMessage` (see fetchRefundList execute). */
export interface FetchRefundListRawResponse extends IDataObject {
	status?: string;
	errorMessage?: string;
}

// =================
// SETTLEMENT ADAPTER — inner payload.head (checksum input)
// =================

export interface SettlementAdapterInnerHead {
	reqTime: string;
	reqMsgId: string;
}

// =================
// RTDD — NODE INPUT + BODIES (inner `body` before signing)
// =================

export interface SettlementTxnListByDateNodeParams {
	startDate: unknown;
	endDate: unknown;
	/** Pagination and settlement order filter (optional UI collection). */
	additionalFields?: IDataObject;
}

export interface SettlementTxnListByDateRtddBody {
	ipRoleId: string;
	settlementStartTime: string;
	settlementEndTime: string;
	pageNum: number;
	pageSize: number;
	settlementOrderId?: string;
}

export interface SettlementBillListNodeParams {
	pageNum: number;
	pageSize: number;
	additionalFields?: IDataObject;
}

export interface SettlementBillListRtddBody {
	ipRoleId: string;
	settledStartTime: string;
	settledEndTime: string;
	pageNum: number;
	pageSize: number;
	isSort: boolean;
	isFilterZeroAmount: boolean;
	isEventFlow: boolean;
	/** Payout ID filter. */
	settlementBillId?: string;
	utrNo?: string;
	settlementStartTime?: string;
	settlementEndTime?: string;
	/** e.g. PAYOUT_SETTLED, PAYOUT_UNSETTLED, BANK_INITIATED, WAIT_FOR_SETTLE */
	settleStatus?: string;
	version?: string;
}

export interface OrderDetailNodeParams {
	bizOrderId: string;
	isSettlementInfo: boolean;
	excludePaymentsData: boolean;
}

export interface OrderDetailRtddBody {
	ipRoleId: string;
	bizOrderId: string;
	isSettlementInfo?: boolean;
	excludePaymentsData?: boolean;
}

export interface RtddBizorderSearchNodeParams {
	startDate: unknown;
	endDate: unknown;
	searchKey: string;
	searchValueBizOrderId: string;
	searchValueExtSerial: string;
	searchValueMerchantTrans: string;
	bizOrderTypes: string[];
}

export interface RtddSearchCondition {
	searchKey: string;
	searchValue: string;
}

export interface RtddBizorderSearchRtddBody {
	orderCreatedStartTime: string;
	orderCreatedEndTime: string;
	bizOrderTypes: string[];
	searchConditions?: RtddSearchCondition[];
}

