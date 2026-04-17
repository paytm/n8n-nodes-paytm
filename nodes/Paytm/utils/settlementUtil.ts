/**
 * Settlement APIs: signed request envelope for Paytm’s internal settlement path
 * (`/merchant-adapter/internal/{function}` — path is fixed by the upstream contract).
 */

import { randomUUID } from 'crypto';
import type { IExecuteFunctions } from 'n8n-workflow';

import { PAYTM_API_CREDENTIAL_NAME, SECURE_PAYMENTS_BASE_URLS } from '../constants';
import { resolvePaytmCredentialEnvironment } from './credentialUtil';

const SETTLEMENT_DATETIME_TZ = '+05:30';

function getSettlementBaseUrl(environmentRaw: string | undefined): string {
	const env = resolvePaytmCredentialEnvironment(environmentRaw);
	const url = SECURE_PAYMENTS_BASE_URLS[env];
	return url.replace(/\/+$/, '');
}

/** Function name segment in the settlement internal URL path (must match upstream). */
export const SETTLEMENT_FUNCTION = {
	TXN_LIST_BY_DATE: 'settlementTxnListByDate',
	BILL_LIST: 'settlementBillList',
	ORDER_DETAIL: 'orderDetail',
} as const;

export function dateToIsoStart(dateStr: string): string {
	return `${dateStr}T00:00:00${SETTLEMENT_DATETIME_TZ}`;
}

export function dateToIsoEnd(dateStr: string): string {
	return `${dateStr}T23:59:59${SETTLEMENT_DATETIME_TZ}`;
}

/**
 * Current time as `YYYY-MM-DDTHH:mm:ss+05:30` (IST; settlement request contract).
 */
function formatReqTimeIST(now: Date = new Date()): string {
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

export interface SettlementRuntime {
	baseUrl: string;
	merchantId: string;
	keySecret: string;
}

function trimShallowStringFields(obj: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		out[k] = typeof v === 'string' ? v.trim() : v;
	}
	return out;
}

/**
 * Settlement wire envelope: `{ requestId, payload: { head, body } }` with `merchantId` merged into `body`.
 * Signing input is compact JSON of this object (same string used for checksum).
 */
export function buildSettlementOuterEnvelope(
	runtime: SettlementRuntime,
	businessBody: Record<string, unknown>,
): { requestId: string; outerBody: Record<string, unknown> } {
	const requestId = randomUUID();
	const innerHead = {
		reqTime: formatReqTimeIST(),
		reqMsgId: requestId,
	};
	const innerBody = trimShallowStringFields({
		...businessBody,
		merchantId: runtime.merchantId,
	});
	const outerBody: Record<string, unknown> = {
		requestId,
		payload: {
			head: innerHead,
			body: innerBody,
		},
	};
	return { requestId, outerBody };
}

export async function getSettlementRuntime(context: IExecuteFunctions): Promise<SettlementRuntime> {
	const creds = await context.getCredentials(PAYTM_API_CREDENTIAL_NAME);
	const merchantId = String(creds.merchantId ?? '').trim();
	const keySecret = String(creds.keySecret ?? '').trim();
	if (!merchantId || !keySecret) {
		throw new Error(
			'Paytm API credentials: Merchant ID and Key Secret must be non-empty after trimming whitespace.',
		);
	}
	const baseUrl = getSettlementBaseUrl(creds.environment as string | undefined);
	return {
		baseUrl,
		merchantId,
		keySecret,
	};
}
