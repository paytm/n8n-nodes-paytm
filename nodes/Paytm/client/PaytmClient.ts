/**
 * Paytm API client: checksum auth (Payments, Refund, Subscription).
 */

import * as https from 'https';
import type { PaytmCredentials } from '../types';
import { generateSignature } from './checksum';

const DEFAULT_BASE_URL = 'https://secure.paytmpayments.com';

export type { PaytmCredentials } from '../types';

export class PaytmClient {
	constructor(
		private readonly credentials: PaytmCredentials,
		private readonly baseUrl: string = DEFAULT_BASE_URL,
	) {}

	async requestWithChecksum(
		method: 'POST',
		path: string,
		body: object,
		headExtra: Record<string, string> = {},
	): Promise<Record<string, unknown>> {
		const signature = await generateSignature(body as Record<string, unknown>, this.credentials.keySecret);
		const payload = {
			body,
			head: {
				tokenType: 'AES',
				signature,
				channelId: 'WEB',
				...headExtra,
			},
		};
		return this.request(method, path, payload);
	}

	/**
	 * POST `/subscription/create?mid=&orderId=` — checksum is over `body` only; optional head fields (clientId, channelId, …) merge after signature.
	 */
	async subscriptionInitiate(
		orderId: string,
		body: Record<string, unknown>,
		headExtra?: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const signature = await generateSignature(body, this.credentials.keySecret);
		const head: Record<string, unknown> = { signature };
		if (headExtra) {
			for (const [k, v] of Object.entries(headExtra)) {
				if (v !== undefined && v !== null && v !== '') {
					head[k] = v;
				}
			}
		}
		const payload = {
			body,
			head,
		};
		const mid = this.credentials.merchantId;
		const qs = new URLSearchParams({ mid, orderId }).toString();
		return this.request('POST', `/subscription/create?${qs}`, payload);
	}

	private request(
		method: string,
		path: string,
		body?: Record<string, unknown>,
		customHeaders?: Record<string, string>,
	): Promise<Record<string, unknown>> {
		const url = new URL(path.startsWith('http') ? path : this.baseUrl + path);
		const bodyStr = body ? JSON.stringify(body) : undefined;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...customHeaders,
		};
		if (bodyStr) headers['Content-Length'] = String(Buffer.byteLength(bodyStr, 'utf8'));

		return new Promise((resolve, reject) => {
			const req = https.request(
				{
					hostname: url.hostname,
					port: url.port || 443,
					path: url.pathname + url.search,
					method,
					headers,
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
