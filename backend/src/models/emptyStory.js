const emptyBackground = require('./emptyBackground');
const emptyScenario = require('./emptyScenario');

function emptyStory(storyTitle, storyDescription) {
	let title;
	let body;
	if (storyTitle !== undefined) title = storyTitle.toString();
	if (storyDescription !== undefined) body = storyDescription.toString();
	return {
		story_id: 0,
		assignee: 'unassigned',
		title,
		body,
		issue_number: undefined,
		background: emptyBackground(),
		scenarios: [emptyScenario()],
		storySource: 'db',
		repo_type: 'db',
		state: 'open',
		assignee_avatar_url: null,
		lastTestPassed: null,
		oneDriver: false
	};
}
module.exports = emptyStory;
