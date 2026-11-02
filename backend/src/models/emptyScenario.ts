import { type Scenario } from '@seed-test/shared/models/Scenario.js';

// Unused imports removed
export function emptyScenario(): Omit<Scenario, '_id' | 'scenario_id'> & { scenario_id: number } {
	return {
		scenario_id: 1,
		name: 'New Scenario',
		comment: '',
		stepDefinitions: {
			given: [],
			when: [],
			then: [] // NOSONAR typescript:S7739 Gherkin step key, not a thenable
		},
		multipleScenarios: []
	};
}