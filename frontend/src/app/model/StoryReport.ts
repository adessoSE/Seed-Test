/**
 * Interface of a report
 */
import {StepResults} from './StepResults';
import {ScenarioStatus} from './ScenarioStatus';

export interface StoryReport {

    /**
     * Object id of the report of the databse
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

    // /**
    //  * Cucumber report in json format
    //  */
    // jsonReport: any;

    /**
     * included options to create html
     */
    reportOptions: any;

    /**
     * Story id of the executed test
     */
    storyId?: any;

    /**
     * Mode: either feature, scenario
     */
    mode: string;

    /**
     * scenario id of the executed test
     */
    scenarioId?: any;

    /**
     * Status if the test was successfull or not
     */
    testStatus: boolean;

    /**
     * Status of the report if it is marked as saved or not
     */
    isSaved?: boolean;

    /**
     * Status if the test was successfull or not
     */
    overallTestStatus: boolean;

    /**
     * Status / execution result all executed steps in this Story
     */
    storyStepResults: StepResults;

    /**
     * Details to all the Scenarios executed in this Report
     */
    scenarioStatuses: ScenarioStatus[];
}
