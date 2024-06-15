import {Scenario} from './Scenario';
import { Background } from './Background';

/**
 * Interface of the story
 */
export interface Story {
    /**
     * Object id of the story in the database
     */
    _id: any;

    /**
     * Id of the story received from github
     */
    issue_number: any;

    /**
     * Id of the story received from github
     * very similar to issue_number but is currently not used anymore
     */
    story_id: number;

    /**
     * Source of the story
     */
    storySource: string;

    /**
     * Background of the story
     */
    background: Background;

    /**
     * Scenarios in the story
     */
    scenarios: Scenario[];
    oneDriver?: boolean;

    /**
     * Title of the story
     */
    title: string;

    /**
     * Description of the story
     */
    body: string;

    /**
     * State of the github issue
     */
    state: string;

    /**
     * Github user assigned to this issue
     */
    assignee: string;

    /**
     * Url of the assignee avatar
     */
    assignee_avatar_url: string;

    /**
     * If the last test was successful or not
     */
    lastTestPassed?: boolean;

    /*
    * Xray preconditions
    */
    preConditions?: {
        preConditionKey: string;
        testSet: string[];
    }[];

    /*
    * Host
    */
    host: string;
}   
