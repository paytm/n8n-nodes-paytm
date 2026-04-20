/**
 * Paytm AES checksum for secure API requests (Node `crypto` only; no external signing package).
 * Matches the common Paytm Node flow: SHA256(params + '|' + salt) + salt, then AES-128-CBC encrypt with merchant key.
 */

import * as crypto from 'crypto';

const IV = '@@@@&&&&####$$$$';

function ensureKey16(key: string): Buffer {
	const buf = Buffer.from(key, 'utf8');
	if (buf.length >= 16) return buf.subarray(0, 16);
	return Buffer.concat([buf, Buffer.alloc(16 - buf.length, 0)]);
}

function encrypt(input: string, key: string): string {
	const keyBuf = ensureKey16(key);
	const cipher = crypto.createCipheriv('aes-128-cbc', keyBuf, Buffer.from(IV, 'utf8'));
	let encrypted = cipher.update(input, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	return encrypted;
}

function generateRandomString(length: number): string {
	const buf = crypto.randomBytes(Math.ceil((length * 3) / 4));
	return buf.toString('base64').slice(0, length);
}

function calculateHash(params: string, salt: string): string {
	const finalString = params + '|' + salt;
	return crypto.createHash('sha256').update(finalString, 'utf8').digest('hex') + salt;
}

function calculateChecksum(params: string, key: string, salt: string): string {
	const hashString = calculateHash(params, salt);
	return encrypt(hashString, key);
}

/**
 * Serializes `body` to JSON and removes all whitespace, matching Paytm’s typical checksum signing input.
 */
export function compactJsonSigningString<T>(body: T): string {
	return JSON.stringify(body).replace(/\s/g, '');
}

/**
 * Produces the `head.signature` value for Paytm checksum APIs (and settlement header signing).
 * Pass the request body object; compact JSON for signing is derived via {@link compactJsonSigningString}.
 */
export async function generateSignature<T>(body: T, key: string): Promise<string> {
	const keyNormalized = key.trim();
	const str = compactJsonSigningString(body);
	const salt = generateRandomString(4);
	return calculateChecksum(str, keyNormalized, salt);
}
