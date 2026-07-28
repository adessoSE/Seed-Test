import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
	collection: vi.fn()
}));

vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

import { showSteptypes } from './step-type.service.js';

describe('step-type.service', () => {
	const mockCollection = { find: vi.fn() };

	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.collection.mockReturnValue(mockCollection);
	});

	it('should return all step types from the database', async () => {
		const stepTypes = [
			{ id: 1, pre: 'I am on the website ', mid: '', type: 'Website', stepType: 'given', values: [] },
			{ id: 2, pre: 'I click the button ', mid: '', type: 'Button', stepType: 'when', values: [] }
		];
		mockCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue(stepTypes) });

		const result = await showSteptypes();

		expect(result).toEqual(stepTypes);
		expect(mockDb.collection).toHaveBeenCalledWith('stepTypes');
		expect(mockCollection.find).toHaveBeenCalledWith({});
	});

	it('should return empty array when no step types exist', async () => {
		mockCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });

		const result = await showSteptypes();

		expect(result).toEqual([]);
	});
});
