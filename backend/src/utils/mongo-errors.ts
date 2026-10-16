import { MongoServerError } from 'mongodb';

/**
 * Tells whether a write failed on a unique index (MongoDB error code 11000).
 * Services use it to turn the race that an app-level "already exists" check cannot close
 * into the same 409 the check returns.
 * @param error - Anything caught from a driver call.
 * @returns True only for a MongoServerError with code 11000.
 */
export function isDuplicateKeyError(error: unknown): boolean {
	return error instanceof MongoServerError && error.code === 11000;
}
