import { Block } from '@shared/models/Block.js';

// Returns a type compatible with the Block interface, omitting the DB-generated _id
export function emptyBlock(): Omit<Block, '_id'> {
	return {
		owner: '',
		name: '',
		stepDefinitions: {
			given: [],
			when: [],
			then: []
		}
	};
}