import { Background } from '@shared/models/Background';

export function emptyBackground(): Background {
	return {
		name: 'New Background',
		stepDefinitions: {
			when: []
		}
	};
}