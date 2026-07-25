/**
 * MongoDB query injection sanitization.
 * Replaces `express-mongo-sanitize` which is incompatible with Express 5
 * (Express 5 makes req.query a read-only getter).
 */

const DANGEROUS_KEY = /^\$|\./;

/**
 * Recursively removes keys that start with `$` or contain `.` from an object,
 * preventing MongoDB operator injection ($gt, $ne, $where, etc.).
 * Mutates the input in place and returns it.
 */
export function sanitize<T>(target: T): T {
	if (Array.isArray(target)) {
		target.forEach(sanitize);
	} else if (target !== null && typeof target === 'object') {
		for (const key of Object.keys(target)) {
			if (DANGEROUS_KEY.test(key))
				delete (target as Record<string, unknown>)[key];
			else
				sanitize((target as Record<string, unknown>)[key]);
		}
	}
	return target;
}

/**
 * Returns true if the target contains any keys starting with `$` or containing `.`.
 * Use this on read-only objects (like Express 5's req.query) where in-place
 * sanitization isn't possible.
 */
export function hasDangerousKeys(target: unknown): boolean {
	if (Array.isArray(target))
		return target.some(hasDangerousKeys);
	if (target !== null && typeof target === 'object')
		return Object.keys(target).some((key) =>
			DANGEROUS_KEY.test(key) || hasDangerousKeys((target as Record<string, unknown>)[key])
		);
	return false;
}
