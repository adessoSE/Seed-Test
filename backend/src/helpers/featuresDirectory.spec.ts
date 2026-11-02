import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const { mockedFs } = vi.hoisted(() => ({
	mockedFs: {
		mkdirSync: vi.fn(),
		default: undefined as any
	}
}));

mockedFs.default = mockedFs;

vi.mock('node:fs', () => mockedFs);

import { ensureFeaturesDirectory } from './featuresDirectory.js';

describe('ensureFeaturesDirectory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates the features directory under the working directory, recursively', () => {
		ensureFeaturesDirectory();

		expect(mockedFs.mkdirSync).toHaveBeenCalledTimes(1);
		expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
			path.join(process.cwd(), 'features'),
			{ recursive: true }
		);
	});
});
