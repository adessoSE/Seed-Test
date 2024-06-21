function emptyScenario() {
  return {
    scenario_id: 1,
    name: 'New Scenario',
    comment: null,
    stepDefinitions:
    {
      given: [],
      when: [],
      then: [],
    },
    multipleScenarios: []
  };
}
module.exports = emptyScenario;
