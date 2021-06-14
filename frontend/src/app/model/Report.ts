
/**
 * Interface of a report
 */
export interface Report {

    /**
     * Object id of the report of the databse
     */
    _id?: any,

    /**
     * Time of the run test in milliseconds since 1970
     */
    reportTime: number;

    /**
     * Name of the report
     */
    reportName: string;

    /**
     * Cucumber report in json format
     */
    jsonReport: any;

    /**
     * included options to create html
     */
    options: any;

    /**
     * Story id of the executed test
     */
    storyId: any;

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
}