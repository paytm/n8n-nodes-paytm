import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { assertPaytmChecksumResponse, createPaytmClientFromCredentialData } from './helpers';

/**
 * Runs when the user clicks "Test" on Paytm API credentials.
 * Calls the same endpoint as "Get many payment link details": POST `/link/fetch` with a minimal body `{ mid }`.
 * The Fetch Link API accepts additional optional filters; the credential test only verifies checksum and connectivity.
 */
export async function paytmApiCredentialTest(
	credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
): Promise<INodeCredentialTestResult> {
	const data = credential.data;
	const mid = (data?.merchantId as string)?.trim();
	const keySecret = (data?.keySecret as string)?.trim();
	if (!mid || !keySecret) {
		return { status: 'Error', message: 'Merchant ID and Key Secret are required.' };
	}
	try {
		const client = createPaytmClientFromCredentialData(data);
		const res = await client.requestWithChecksum('POST', '/link/fetch', { mid });
		assertPaytmChecksumResponse(res);
		return { status: 'OK', message: 'Connection successful!' };
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		return { status: 'Error', message: msg };
	}
}
