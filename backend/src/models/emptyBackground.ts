import { Background } from '@shared/models/Background.js';

export function emptyBackground(): Background {
	return {
		name: 'New Background',
		stepDefinitions: {
			when: []
		}
	};
}