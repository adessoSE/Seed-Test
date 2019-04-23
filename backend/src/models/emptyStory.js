function emptyStory() {
  return {
    story_id: '',
    background: {
        stepDefinitions: [
          {
            when: []
          }
        ]
      },
    scenarios: [
      {
        scenario_id: 1,
        name: '',
        stepDefinitions: [
          {
            given: [],
            when: [],
            then: [],
            example: []
          }
        ]
      }
    ]
  }
}
module.exports = emptyStory;
