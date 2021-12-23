function emptyScenario() {
  return {
    scenario_id: 1,
    name: undefined,
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
