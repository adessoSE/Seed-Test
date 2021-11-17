import {StoryStatus} from './StoryStatus';
import {StepResults} from './StepResults';
/**
 * Interface of a report
 */
export interface GroupReport {

  /**
   * Object id of the report of the database
   */
  _id?: any;

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
  reportOptions: any;

  /**
   * Mode: either feature, scenario
   */
  mode: string;

  /**
   * Status of the report if it is marked as saved or not
   */
  isSaved?: boolean;

  /**
   * Status if the test was successful or not
   */
  overallTestStatus: boolean;

  /**
   * Details to all the Stories executed in this GroupReport
   */
  storyStatuses: StoryStatus[];

  /**
   * Status / execution result all executed steps in this Group Execution
   */
  groupStepResults: StepResults;
}
