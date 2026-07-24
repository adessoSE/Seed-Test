import {ScenarioStatus} from './ScenarioStatus';
/**
 * Interface of a report
 */
export interface ScenarioReport {

  /**
   * Object id of the report of the database
   */
  _id?: string;

  /**
   * Name of the report
   */
  reportName: string;

  /**
   * Time of the run test in milliseconds since 1970
   */
  reportTime: number;

  /**
   * included options to create html
   */
  reportOptions: Record<string, unknown>;

  /**
   * Story id of the executed test
   */
  storyId: string;

  /**
   * Mode: either feature, scenario
   */
  mode: string;

  /**
   * scenario id of the executed test
   */
  scenarioId: string;

  /**
   * Status if the test was successful or not
   */
  overallTestStatus: boolean;

  /**
   * Status of the report if it is marked as saved or not
   */
  isSaved?: boolean;

  /**
   * Details to  the Scenario executed in this Report
   */
  scenarioStatuses: ScenarioStatus;
}
