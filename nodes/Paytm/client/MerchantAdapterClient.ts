/**
 * HTTP(S) client for merchant-adapter settlement wrapper (replaces direct RTDD gateway calls).
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export async function postMerchantAdapterJson(
	baseUrl: string,
	functionName: string,
	mid: string,
	headers: { signature: string; xPgpUniqueId: string },
	body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const base = baseUrl.replace(/\/+$/, '');
	const pathAndQuery = `/merchant-adapter/internal/${functionName}?${new URLSearchParams({ mid }).toString()}`;
	const fullUrl = new URL(pathAndQuery, `${base}/`).toString();
	// POST entity is exactly `body` (e.g. { requestId, payload }) — no extra wrapper on the wire.
	const bodyStr = JSON.stringify(body);
	const isHttps = new URL(fullUrl).protocol === 'https:';
	const lib = isHttps ? https : http;
	const url = new URL(fullUrl);

	const hdrs: Record<string, string> = {
		'Content-Type': 'application/json',
		'Content-Length': String(Buffer.byteLength(bodyStr, 'utf8')),
		signature: headers.signature,
		'X-PGP-Unique-ID': headers.xPgpUniqueId,
	};

	return new Promise((resolve, reject) => {
		const req = lib.request(
			{
				hostname: url.hostname,
				port: url.port || (isHttps ? 443 : 80),
				path: url.pathname + url.search,
				method: 'POST',
				headers: hdrs,
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
									(data as { message?: string; error?: string })?.message ||
										(data as { error?: string })?.error ||
										`HTTP ${res.statusCode}: ${raw.slice(0, 500)}`,
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
		req.write(bodyStr, 'utf8');
		req.end();
	});
}
