import type { PaytmChecksumApiResponse } from '../types';

/**
 * Validates we received a usable checksum-API envelope from Paytm.
 * Does **not** throw on `resultStatus` PENDING / FAILURE — those are returned in `body` for the workflow to handle.
 */
export function responseValidation(res: unknown): asserts res is PaytmChecksumApiResponse {
	if (res === null || res === undefined) {
		throw new Error('No response received from Paytm');
	}
	if (typeof res !== 'object' || Array.isArray(res)) {
		throw new Error('Invalid response from Paytm');
	}
	const r = res as Record<string, unknown>;
	if (Object.keys(r).length === 0) {
		throw new Error('Empty response from Paytm');
	}
	if (r.body === undefined || r.body === null) {
		throw new Error('No response body from Paytm');
	}
}

/** Normalizes settlement internal API JSON (`status`, `data`, `error`) for node output. */
export function settlementResponseValidation(raw: Record<string, unknown>): Record<string, unknown> {
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
