import { type Background } from '@seed-test/shared/models/Background.js';

export function emptyBackground(): Background {
	return {
		name: 'New Background',
		stepDefinitions: {
			when: []
		}
	};
}