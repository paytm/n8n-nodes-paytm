/**
 * n8n date/time parameters → wire-format strings (named by **output shape**).
 */

function toLocalYyyyMmDd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Maps `Intl.DateTimeFormat#formatToParts` output to a lookup by part type (skips literals). */
function dateTimeFormatPartsToMap(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
	const m: Record<string, string> = {};
	for (const p of parts) {
		if (p.type !== 'literal') m[p.type] = p.value;
	}
	return m;
}

/** Coerces node input to an ISO-8601-style datetime string (intermediate form). */
export function toIsoDateTimeString(value: unknown): string {
	if (value == null || value === '') return '';

	if (typeof value === 'number' && Number.isFinite(value)) {
		return new Date(value).toISOString();
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString();
	}

	if (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { toISO?: unknown }).toISO === 'function'
	) {
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

/** `YYYY-MM-DDTHH:mm:ss+05:30` (Asia/Kolkata wall time + fixed offset). */
export function toYyyyMmDdThhMmSsPlus0530(isoOrParsable: string): string {
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
	const m = dateTimeFormatPartsToMap(parts);
	return `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}:${m.second}+05:30`;
}

/** `YYYY-MM-DD` (local calendar date where applicable). */
export function toYyyyMmDd(value: unknown): string {
	if (value == null || value === '') return '';

	if (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { toISODate?: unknown }).toISODate === 'function'
	) {
		const isoDate = (value as { toISODate: () => string | null }).toISODate();
		if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return toLocalYyyyMmDd(new Date(value));
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return toLocalYyyyMmDd(value);
	}

	const s = toIsoDateTimeString(value);
	if (!s) return '';
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	const parsed = Date.parse(s);
	if (Number.isNaN(parsed)) return s;
	return toLocalYyyyMmDd(new Date(parsed));
}

/** `DD/MM/YYYY` or `DD/MM/YYYY HH:MM:SS` (IST, 24h). */
function formatDdMmYyyySlashIst(d: Date, withTime: boolean): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Kolkata',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		...(withTime
			? {
					hour: '2-digit' as const,
					minute: '2-digit' as const,
					second: '2-digit' as const,
					hourCycle: 'h23' as const,
				}
			: {}),
	}).formatToParts(d);
	const m = dateTimeFormatPartsToMap(parts);
	return withTime
		? `${m.day}/${m.month}/${m.year} ${m.hour}:${m.minute}:${m.second}`
		: `${m.day}/${m.month}/${m.year}`;
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
 * `DD/MM/YYYY` or `DD/MM/YYYY HH:MM:SS` (IST). Midnight IST → short form; else long form.
 */
export function toDdMmYyyySlashIstFromNodeValue(value: unknown): string {
	const rawDt = toIsoDateTimeString(value);
	if (rawDt) {
		const ms = Date.parse(rawDt);
		if (!Number.isNaN(ms)) {
			const d = new Date(ms);
			if (isMidnightIst(d)) return formatDdMmYyyySlashIst(d, false);
			return formatDdMmYyyySlashIst(d, true);
		}
	}
	const ymd = toYyyyMmDd(value);
	if (ymd) {
		const ms = Date.parse(`${ymd}T12:00:00`);
		if (!Number.isNaN(ms)) return formatDdMmYyyySlashIst(new Date(ms), false);
	}
	return '';
}

/**
 * `dd/mm/yyyy hh:mm:ss` from ISO **calendar digits** (no UTC→IST shift; wall clock preserved).
 */
export function toDdMmYyyySpaceHhMmSsFromIsoDigits(iso: string): string | null {
	const t = iso.trim();
	const m = t.match(
		/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i,
	);
	if (!m) return null;
	const [, y, mo, d, h, mi, sec] = m;
	const s = sec ?? '00';
	return `${d}/${mo}/${y} ${h}:${mi}:${s}`;
}

/** `dd/mm/yyyy` ← `YYYY-MM-DD` (digit reorder only). */
export function yyyyMmDdToDdMmYyyySlash(ymd: string): string | null {
	const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return null;
	const [, y, mo, d] = m;
	return `${d}/${mo}/${y}`;
}
