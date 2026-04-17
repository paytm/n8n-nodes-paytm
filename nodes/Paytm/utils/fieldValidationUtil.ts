import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

export const MANDATORY_FIELDS_ERROR_MESSAGE = 'Please fill all mandatory fields.';

export function assertMandatoryStrings(
	exec: IExecuteFunctions,
	itemIndex: number,
	...values: Array<string | undefined | null>
): void {
	for (const v of values) {
		if (v === undefined || v === null || !String(v).trim()) {
			throw new NodeOperationError(exec.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
		}
	}
}

export function assertMandatoryNumber(
	exec: IExecuteFunctions,
	itemIndex: number,
	value: number | undefined | null,
): void {
	if (value === undefined || value === null || Number.isNaN(value)) {
		throw new NodeOperationError(exec.getNode(), MANDATORY_FIELDS_ERROR_MESSAGE, { itemIndex });
	}
}
