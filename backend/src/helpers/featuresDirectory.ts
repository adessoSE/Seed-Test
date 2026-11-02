import fs from 'node:fs';
import path from 'node:path';

/**
 * Creates the `features/` folder under the backend working directory if it is missing.
 * Story, script, sanity and report code write below this folder with paths relative to process.cwd(),
 * so a fresh checkout without it would fail with 500 on the first story creation.
 * Side effect: creates the directory on disk; safe to call repeatedly (recursive mkdir is idempotent).
 */
export function ensureFeaturesDirectory(): void {
	fs.mkdirSync(path.join(process.cwd(), 'features'), { recursive: true });
}
