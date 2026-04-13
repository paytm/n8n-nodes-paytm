/**
 * Normalize n8n `dateTime` parameter values for Paytm APIs.
 */

function toLocalYyyyMmDd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function luxonDateTimeToIso(value: unknown): string | undefined {
	try {
		const { DateTime } = require('luxon') as {
			DateTime: { isDateTime: (v: unknown) => boolean };
		};
		if (DateTime.isDateTime(value)) {
			const dt = value as { toISO: () => string | null; isValid: boolean };
			if (dt.isValid) {
				const iso = dt.toISO();
				if (typeof iso === 'string' && iso.trim()) return iso.trim();
			}
			return '';
		}
	} catch {
		/* luxon not available */
	}
	return undefined;
}

export function normalizeDateTimeParam(value: unknown): string {
	if (value == null || value === '') return '';

	const fromLuxon = luxonDateTimeToIso(value);
	if (fromLuxon !== undefined) return fromLuxon;

	if (typeof value === 'number' && Number.isFinite(value)) {
		return new Date(value).toISOString();
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString();
	}

	if (typeof value === 'object' && value !== null && typeof (value as { toISO?: unknown }).toISO === 'function') {
		const iso = (value as { toISO: () => string | null }).toISO();
		if (typeof iso === 'string' && iso.trim()) return iso.trim();
		return '';
	}

	if (typeof value === 'object' && value !== null && 'date' in value) {
		const o = value as { date?: unknown; time?: unknown };
		if (typeof o.date === 'string' && o.date.trim()) {
			const datePart = o.date.trim();
			const timePart = typeof o.time === 'string' && o.time.trim() ? o.time.trim() : '00:00:00.000';
			const combined = `${datePart}T${timePart}`;
			const parsed = Date.parse(combined);
			if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
		}
	}

	const s = String(value).trim();
	if (!s || s === '[object Object]') return '';
	return s;
}

export function formatPaytmPassbookDateTime(isoOrParsable: string): string {
	const raw = isoOrParsable.trim();
	if (!raw) return '';
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:30$/.test(raw)) return raw;

	const t = Date.parse(raw);
	if (Number.isNaN(t)) return raw;

	const d = new Date(t);
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Kolkata',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(d);
	const m: Record<string, string> = {};
	for (const p of parts) {
		if (p.type !== 'literal') m[p.type] = p.value;
	}
	return `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}:${m.second}+05:30`;
}

export function normalizeDateOnlyParam(value: unknown): string {
	if (value == null || value === '') return '';

	try {
		const { DateTime } = require('luxon') as {
			DateTime: { isDateTime: (v: unknown) => boolean };
		};
		if (DateTime.isDateTime(value)) {
			const dt = value as { toISODate: () => string | null };
			const isoDate = dt.toISODate();
			if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
		}
	} catch {
		/* luxon not available */
	}

	if (typeof value === 'object' && value !== null && typeof (value as { toISODate?: unknown }).toISODate === 'function') {
		const isoDate = (value as { toISODate: () => string | null }).toISODate();
		if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return toLocalYyyyMmDd(new Date(value));
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return toLocalYyyyMmDd(value);
	}

	const s = normalizeDateTimeParam(value);
	if (!s) return '';
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	const parsed = Date.parse(s);
	if (Number.isNaN(parsed)) return s;
	return toLocalYyyyMmDd(new Date(parsed));
}

/** `DD/MM/YYYY` in Asia/Kolkata (for Paytm link APIs). */
function formatDdMmYyyySlashIst(d: Date): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Kolkata',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).formatToParts(d);
	const m: Record<string, string> = {};
	for (const p of parts) {
		if (p.type !== 'literal') m[p.type] = p.value;
	}
	return `${m.day}/${m.month}/${m.year}`;
}

/** `DD/MM/YYYY HH:MM:SS` in Asia/Kolkata (24h). */
function formatDdMmYyyyHhMmSsSlashIst(d: Date): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Kolkata',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(d);
	const b: Record<string, string> = {};
	for (const p of parts) {
		if (p.type !== 'literal') b[p.type] = p.value;
	}
	return `${b.day}/${b.month}/${b.year} ${b.hour}:${b.minute}:${b.second}`;
}

function isMidnightIst(d: Date): boolean {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Kolkata',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(d);
	const h = parts.find((p) => p.type === 'hour')?.value;
	const min = parts.find((p) => p.type === 'minute')?.value;
	const sec = parts.find((p) => p.type === 'second')?.value;
	return h === '00' && min === '00' && sec === '00';
}

/**
 * Paytm `/link/fetch` search filter dates: `DD/MM/YYYY` or `DD/MM/YYYY HH:MM:SS` (IST).
 * Date-only (midnight in IST) uses the short form; any non-midnight IST time uses the long form.
 */
export function formatPaytmLinkFetchSearchDate(value: unknown): string {
	const rawDt = normalizeDateTimeParam(value);
	if (rawDt) {
		const ms = Date.parse(rawDt);
		if (!Number.isNaN(ms)) {
			const d = new Date(ms);
			if (isMidnightIst(d)) return formatDdMmYyyySlashIst(d);
			return formatDdMmYyyyHhMmSsSlashIst(d);
		}
	}
	const ymd = normalizeDateOnlyParam(value);
	if (ymd) {
		const ms = Date.parse(`${ymd}T12:00:00`);
		if (!Number.isNaN(ms)) return formatDdMmYyyySlashIst(new Date(ms));
	}
	return '';
}

/**
 * Create payment link `expiryDate`: `dd/mm/yyyy hh:mm:ss` from normalized ISO **calendar digits**
 * (no UTC→IST conversion). n8n often stores `YYYY-MM-DDTHH:mm:ss.sssZ`; Paytm expects the same
 * wall-clock numbers the user chose (e.g. `00:00:00` stays `00:00:00`, not `05:30:00` after IST).
 */
export function formatPaytmCreateLinkExpiryFromNormalizedIso(iso: string): string | null {
	const t = iso.trim();
	const m = t.match(
		/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i,
	);
	if (!m) return null;
	const [, y, mo, d, h, mi, sec] = m;
	const s = sec ?? '00';
	return `${d}/${mo}/${y} ${h}:${mi}:${s}`;
}

/** `dd/mm/yyyy` from `YYYY-MM-DD` (literal, no timezone math). */
export function formatPaytmDdMmYyyyFromYyyyMmDd(ymd: string): string | null {
	const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return null;
	const [, y, mo, d] = m;
	return `${d}/${mo}/${y}`;
}
