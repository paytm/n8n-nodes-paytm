/**
 * HTTP client for Paytm secure checksum APIs.
 */

import * as https from 'https';
import { PAYTM_SECURE_BASE_URL_PRODUCTION } from '../constants';
import type { PaytmCredentials } from '../types';

export type { PaytmCredentials } from '../types';

export class PaytmClient {
	constructor(
		_credentials: PaytmCredentials,
		private readonly baseUrl: string = PAYTM_SECURE_BASE_URL_PRODUCTION,
	) {}

	/**
	 * POST-only JSON HTTPS request.
	 * @param options.body Request JSON body.
	 * @param options.headers Optional extra headers merged with `Content-Type` / `Content-Length`.
	 * @param options.url Full `https://` URL or path relative to this client’s `baseUrl`.
	 */
	postClientCall(options: {
		body: Record<string, unknown>;
		headers?: Record<string, string>;
		url: string;
	}): Promise<Record<string, unknown>> {
		const { body, headers, url: pathOrUrl } = options;
		const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : this.baseUrl + pathOrUrl);
		const bodyStr = JSON.stringify(body);
		const mergedHeaders: Record<string, string> = {
			'Content-Type': 'application/json',
			...headers,
		};
		mergedHeaders['Content-Length'] = String(Buffer.byteLength(bodyStr, 'utf8'));

		return new Promise((resolve, reject) => {
			const req = https.request(
				{
					hostname: url.hostname,
					port: url.port || 443,
					path: url.pathname + url.search,
					method: 'POST',
					headers: mergedHeaders,
				},
				(res) => {
					const chunks: Buffer[] = [];
					res.on('data', (chunk: Buffer) => chunks.push(chunk));
					res.on('end', () => {
						const raw = Buffer.concat(chunks).toString('utf8');
						try {
							const data = raw ? JSON.parse(raw) : {};
							if (res.statusCode && res.statusCode >= 400) {
								reject(
									new Error(
										(data as { body?: { resultInfo?: { resultMsg?: string } } }).body?.resultInfo
											?.resultMsg || `HTTP ${res.statusCode}: ${raw}`,
									),
								);
							} else {
								resolve(data as Record<string, unknown>);
							}
						} catch {
							reject(new Error(`Invalid JSON response: ${raw.slice(0, 200)}`));
						}
					});
				},
			);
			req.on('error', reject);
			if (bodyStr) req.write(bodyStr, 'utf8');
			req.end();
		});
	}
}
