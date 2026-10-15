import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison of two OAuth state values. A plain `===` returns earlier for a longer
 * shared prefix, which leaks how much of a guessed state is right. The length check comes first
 * because timingSafeEqual throws on buffers of different lengths.
 */
export function stateMatches(expected: string, received: string): boolean {
	const expectedBuf = Buffer.from(expected);
	const receivedBuf = Buffer.from(received);
	return expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
}
