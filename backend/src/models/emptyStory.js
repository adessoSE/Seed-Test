const emptyBackground = require('./emptyBackground');
const emptyScenario = require('./emptyScenario')


function emptyStory() {
  return {
    story_id: 0,
    assignee: 'unassigned',
    title: undefined,
    body: undefined,
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
