import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

/**
 * Validates that a value is a non-empty, valid MongoDB ObjectId string.
 * Throws AppError.badRequest if the value is missing or malformed.
 *
 * @param value - The string to validate as an ObjectId.
 * @param label - Human-readable name for error messages (e.g. 'repository ID').
 * @returns The validated value, unchanged.
 */
export function requireValidId(value: string | undefined, label: string): string {
	if (!value || !ObjectId.isValid(value))
		throw AppError.badRequest(`Invalid or missing ${label}`);

	return value;
}
