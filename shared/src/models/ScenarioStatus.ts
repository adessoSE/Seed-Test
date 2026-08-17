import {StepResults} from './StepResults.js';

/**
 * Interface of a ScenarioStatus - Details to the Scenario executed a Report
 */
export interface ScenarioStatus {

  /**
   * scenario id of the executed test
   */
  scenarioId: string;

  /**
   * Status if the test was successful or not
   */
  status: boolean;

  /**
   * Status / execution result all executed steps
   */
  stepResults: StepResults;
}
