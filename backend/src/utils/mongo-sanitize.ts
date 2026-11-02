/**
 * Recursively strips MongoDB operator keys (starting with $) from an object.
 * Prevents NoSQL injection by removing any keys that could be interpreted
 * as MongoDB operators (e.g. $gt, $ne, $where).
 */
export function mongoSanitize<T>(v: T): T {
	if (v instanceof Object) {
		const obj = v as Record<string, unknown>;
		for (const key in obj)
			if (/^\$/.test(key))
				delete obj[key];
			else
				mongoSanitize(obj[key]);
	}
	return v;
}
