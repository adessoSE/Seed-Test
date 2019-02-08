function emptyScenario() {
  return {
    scenario_id: 1,
    name: 'New Scenario',
    stepDefinitions:
    {
      given: [],
      when: [],
      then: []
    }
  }
}

module.exports = emptyScenario;
