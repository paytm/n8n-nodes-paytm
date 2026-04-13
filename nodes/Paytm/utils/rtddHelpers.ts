/**
 * Settlement (RTDD) flows via merchant-adapter wrapper: signed inner { head, body } + outer envelope.
 */

import { randomUUID } from 'crypto';
import type { IExecuteFunctions } from 'n8n-workflow';

import { generateSignature } from '../client/checksum';
import { postMerchantAdapterJson } from '../client/MerchantAdapterClient';

export const RTDD_DATETIME_TZ = '+05:30';

/** Path segment after `/merchant-adapter/internal/` — must match merchant-adapter controller. */
export const SETTLEMENT_ADAPTER_FUNCTION = {
	TXN_LIST_BY_DATE: 'settlementTxnListByDate',
	BILL_LIST: 'settlementBillListQuery',
	ORDER_DETAIL: 'orderDetailQuery',
	BIZORDER_SEARCH: 'bizorderSearch',
} as const;

/** Default when credential `merchantAdapterBaseUrl` is empty. */
export const DEFAULT_MERCHANT_ADAPTER_BASE_URL = 'http://localhost:8080';

export function dateToIsoStart(dateStr: string): string {
	return `${dateStr}T00:00:00${RTDD_DATETIME_TZ}`;
}

export function dateToIsoEnd(dateStr: string): string {
	return `${dateStr}T23:59:59${RTDD_DATETIME_TZ}`;
}

/**
 * Current time in Asia/Kolkata as `YYYY-MM-DDTHH:mm:ss+05:30` (merchant-adapter contract).
 */
export function formatReqTimeIndiaKolkata(now: Date = new Date()): string {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Kolkata',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
	const parts = fmt.formatToParts(now);
	const p = Object.fromEntries(
		parts.filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]),
	) as Record<string, string>;
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+05:30`;
}

export function splitCommaList(value: string | undefined): string[] | undefined {
	if (!value?.trim()) return undefined;
	const parts = value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return parts.length ? parts : undefined;
}

export interface SettlementAdapterRuntime {
	baseUrl: string;
	merchantId: string;
	keySecret: string;
}

/**
 * - `status: "FAILED"` + `error` string → `{ error: "<message>" }` only.
 * - `status: "SUCCESS"` + object `data` → return `data` only.
 * - Else → return raw adapter JSON.
 */
export function normalizeMerchantAdapterResponse(raw: Record<string, unknown>): Record<string, unknown> {
	const status = raw.status;
	if (status === 'FAILED') {
		const err = raw.error;
		if (typeof err === 'string' && err.trim()) {
			return { error: err.trim() };
		}
		return { error: 'Request failed' };
	}
	const data = raw.data;
	if (
		status === 'SUCCESS' &&
		data !== undefined &&
		data !== null &&
		typeof data === 'object' &&
		!Array.isArray(data)
	) {
		return data as Record<string, unknown>;
	}
	return raw;
}

export async function getSettlementAdapterRuntime(
	context: IExecuteFunctions,
): Promise<SettlementAdapterRuntime> {
	const creds = await context.getCredentials('paytmApi');
	const raw = (creds.merchantAdapterBaseUrl as string | undefined)?.trim();
	const baseUrl =
		raw && raw.length > 0 ? raw.replace(/\/+$/, '') : DEFAULT_MERCHANT_ADAPTER_BASE_URL;
	return {
		baseUrl,
		merchantId: creds.merchantId as string,
		keySecret: creds.keySecret as string,
	};
}

/**
 * POST `{base}/merchant-adapter/internal/{functionName}?mid=…` with wrapper envelope and checksum headers.
 */
export async function postMerchantAdapterSettlement(
	runtime: SettlementAdapterRuntime,
	functionName: string,
	businessBody: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const requestId = randomUUID();
	const innerHead = {
		reqTime: formatReqTimeIndiaKolkata(),
		reqMsgId: requestId,
	};
	const innerBody: Record<string, unknown> = {
		...businessBody,
		merchantId: runtime.merchantId,
	};
	const signature = await generateSignature(
		{ head: innerHead, body: innerBody },
		runtime.keySecret,
	);
	const outerBody = {
		requestId,
		payload: {
			head: innerHead,
			body: innerBody,
		},
	};

	const raw = await postMerchantAdapterJson(
		runtime.baseUrl,
		functionName,
		runtime.merchantId,
		{ signature, xPgpUniqueId: requestId },
		outerBody,
	);
	return normalizeMerchantAdapterResponse(raw);
}
