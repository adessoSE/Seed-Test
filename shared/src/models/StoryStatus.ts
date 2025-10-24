import {StepResults} from './StepResults';
import {ScenarioStatus} from './ScenarioStatus';

/**
 * Interface of a report - Details to Story executed
 */
export interface StoryStatus {

  /**
   * Story id of the executed test
   */
  storyId: any;

  /**
   * Status if the test was successful or not
   */
  status: boolean;

  /**
   * Status / execution result all executed steps in this Story
   */
  storyStepResults: StepResults;

  /**
   * Details to all the Scenarios executed in this Report
   */
  scenarioStatuses: ScenarioStatus[];
}
