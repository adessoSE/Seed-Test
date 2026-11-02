import { type Story } from '@seed-test/shared/models/Story.js';
import { emptyBackground } from './emptyBackground.js';
import { emptyScenario } from './emptyScenario.js';

export function emptyStory(storyTitle?: string, storyDescription?: string): Omit<Story, '_id'> {
	return {
		story_id: 0,
		assignee: 'unassigned',
		title: storyTitle ?? '',
		body: storyDescription ?? '',
		issue_number: undefined,
		background: emptyBackground(),
		scenarios: [emptyScenario()],
		storySource: 'db',
		repo_type: 'db',
		state: 'open',
		assignee_avatar_url: '',
		lastTestPassed: undefined,
		oneDriver: false,
		// Optimistic-lock counter of PUT /story/:_id; the client sends it back so a stale save answers 409
		version: 0
	};
}