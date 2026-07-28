/**
 * Recursively strips MongoDB operator keys (starting with $) from an object.
 * Prevents NoSQL injection by removing any keys that could be interpreted
 * as MongoDB operators (e.g. $gt, $ne, $where).
 */
export function mongoSanitize(v: any): any {
	if (v instanceof Object)
		for (const key in v)
			if (/^\$/.test(key))
				delete v[key];
			else
				mongoSanitize(v[key]);

	return v;
}
