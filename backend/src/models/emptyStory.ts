import { Story } from '@shared/models/Story';
import { emptyBackground } from './emptyBackground';
import { emptyScenario } from './emptyScenario';

export function emptyStory(storyTitle?: string, storyDescription?: string): Omit<Story, '_id'> {
	return {
		story_id: 0,
		assignee: 'unassigned',
		title: storyTitle || '',
		body: storyDescription || '',
		issue_number: undefined,
		background: emptyBackground(),
		scenarios: [emptyScenario()],
		storySource: 'db',
		repo_type: 'db',
		state: 'open',
		assignee_avatar_url: '',
		lastTestPassed: null,
		oneDriver: false
	};
}