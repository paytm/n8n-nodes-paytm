/**
 * Checksum generation for signed API requests (aligned with Paytm’s [`paytmchecksum`](https://www.npmjs.com/package/paytmchecksum) package).
 */

const paytmChecksumLib = require('paytmchecksum') as {
	generateSignature: (params: string | Record<string, unknown>, key: string) => Promise<string>;
};

/**
 * Generates Paytm request checksums using the official Node [`paytmchecksum`](https://www.npmjs.com/package/paytmchecksum) package (`require('paytmchecksum')`).
 * Matches Paytm’s published Node checksum flow—pass a flat object or a compact JSON string plus your key secret.
 *
 * - **Flat param maps** (e.g. `MID`, `ORDERID`): pass the object; the library sorts keys and joins values with `|`.
 * - **Payload that must be signed as a single JSON string** (common for secure API `body`): pass
 *   compact `JSON.stringify(body)` (no spaces) so signing matches the string branch of the official helper.
 */
export async function generateChecksum(
	params: string | Record<string, unknown>,
	key: string,
): Promise<string> {
	return paytmChecksumLib.generateSignature(params, key.trim());
}
