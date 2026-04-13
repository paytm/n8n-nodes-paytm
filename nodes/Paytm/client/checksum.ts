/**
 * Paytm checksum generation (aligned with Paytm Node checksum flow).
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

export async function generateSignature(
	params: string | Record<string, unknown>,
	key: string,
): Promise<string> {
	const str = typeof params === 'string' ? params : JSON.stringify(params);
	const salt = generateRandomString(4);
	return calculateChecksum(str, key, salt);
}
