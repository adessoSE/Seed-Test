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
      example: [],
    },
  };
}
module.exports = emptyScenario;
