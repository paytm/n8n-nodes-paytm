/**
 * Paytm API request/response TypeScript interfaces used by node operations.
 * Responses are partially typed where the code reads them.
 */

import type { IDataObject } from 'n8n-workflow';

import type { PaytmCredentialEnvironment } from '../constants';

// =================
// CREDENTIALS
// =================

/** Decrypted Paytm API credential fields passed into `PaytmClient`. */
export interface PaytmCredentials {
	merchantId: string;
	keySecret: string;
	environment?: PaytmCredentialEnvironment | string;
}

// =================
// CHECKSUM API — COMMON
// =================

/** Inner `body` object for checksum APIs (before unwrapping with `getBody`). */
export interface PaytmChecksumApiBody {
	/** Typical `body.resultInfo` on secure.paytmpayments.com JSON responses. */
	resultInfo?: {
		resultStatus?: string;
		resultMsg?: string;
		resultCode?: string;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

/** Parsed top-level JSON for most checksum POSTs (structure varies by endpoint). */
export interface PaytmChecksumApiResponse {
	body?: PaytmChecksumApiBody;
	[key: string]: unknown;
}

// =================
// PAYMENTS — REQUEST BODIES (checksum `body` only)
// =================

/** Merchant passbook order list — JSON `body` inside the checksum envelope. */
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

/** `/link/fetchTransaction` request `body`. */
export interface FetchTransactionsForLinkBody {
	mid: string;
	linkId: string;
	/** `DD/MM/YYYY` or `DD/MM/YYYY HH:MM:SS` (IST) per Paytm API. */
	searchStartDate?: string;
	/** `DD/MM/YYYY` or `DD/MM/YYYY HH:MM:SS` (IST) per Paytm API. */
	searchEndDate?: string;
	fetchAllTxns?: boolean;
}

/** Date strings as `DD/MM/YYYY` or `DD/MM/YYYY HH:MM:SS` (IST) for Paytm `/link/fetch`. */
export interface FetchPaymentLinksSearchFilter {
	fromDate?: string;
	toDate?: string;
	isActive?: boolean;
}

/** `/link/fetch` request `body` (search filters optional). */
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

/** Customer contact block for `/link/create` (omit empty fields when building the request). */
export interface CreatePaymentLinkCustomerContact {
	customerName?: string;
	customerEmail?: string;
	customerMobile?: string;
}

/** `/link/create` request `body` — core + optional fields per Paytm docs. */
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
// REFUND — REQUEST BODIES
// =================

/** Refund list API — JSON `body`. */
export interface FetchRefundListBody {
	mid: string;
	isSort: boolean;
	startDate: string;
	endDate: string;
	pageNum: number;
	pageSize: number;
}

/** Refund status (v2) API — JSON `body`. */
export interface CheckRefundStatusBody {
	mid: string;
	orderId: string;
	refId: string;
}

/** Optional agent metadata on initiate refund. */
export interface InitiateRefundAgentInfo {
	employeeId?: string;
	name?: string;
	phoneNo?: string;
	email?: string;
}

/** `/refund/apply` request `body`. */
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
// SUBSCRIPTION — REQUEST BODIES (checksum `body` only)
// =================

/** Subscription cancel API — JSON `body`. */
export interface CancelSubscriptionBody {
	mid: string;
	subsId: string;
}

/** Subscription pause/resume API — JSON `body`. */
export interface PauseResumeSubscriptionBody {
	mid: string;
	subsId: string;
	status: 'SUSPENDED' | 'ACTIVE';
}

/** Subscription check-status API — JSON `body`. */
export interface FetchSubscriptionStatusBody {
	mid: string;
	subsId?: string;
	orderId?: string;
	custId?: string;
	linkId?: string;
}

/** Raw refund-list HTTP JSON (top-level `status` / `errorMessage`). */
export interface FetchRefundListRawResponse extends IDataObject {
	status?: string;
	errorMessage?: string;
}

// =================
// SETTLEMENT — REQUEST BODIES (inner `body` before signing)
// =================

/** Transaction list by date — inner signed `body`. */
export interface SettlementTxnListByDateBody {
	ipRoleId: string;
	settlementStartTime: string;
	settlementEndTime: string;
	pageNum: number;
	pageSize: number;
	settlementOrderId?: string;
}

/** Bill list — inner signed `body`. */
export interface SettlementBillListBody {
	ipRoleId: string;
	settlementStartTime: string;
	settlementEndTime: string;
	pageNum: number;
	pageSize: number;
	isSort: boolean;
	isFilterZeroAmount: boolean;
	isEventFlow: boolean;
	/** Payout ID filter. */
	settlementBillId?: string;
	utrNo?: string;
	/** e.g. PAYOUT_SETTLED, PAYOUT_UNSETTLED, BANK_INITIATED, WAIT_FOR_SETTLE */
	settleStatus?: string;
	version?: string;
}

/** Order detail — inner signed `body`. */
export interface OrderDetailSettlementBody {
	ipRoleId: string;
	bizOrderId: string;
	isSettlementInfo?: boolean;
	excludePaymentsData?: boolean;
}

