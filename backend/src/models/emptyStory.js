const emptyBackground = require('./models/emptyBackground');


function emptyStory() {
  return {
    story_id: '',
    background: emptyBackground(),
    scenarios: [
      {
        scenario_id: 1,
        name: '',
        stepDefinitions: [
          {
            given: [],
            when: [],
            then: [],
            example: [],
          },
        ],
      },
    ],
  };
}
module.exports = emptyStory;
