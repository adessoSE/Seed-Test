import { StoryReport } from './StoryReport.js';
import {ScenarioReport} from './ScenarioReport.js';
import {GroupReport} from './GroupReport.js';

/**
 * Interface of a StoryReport container for the report history
 */
export interface ReportContainer {
    /**
     * Reports of the story
     */
    storyReports: StoryReport[];

    /**
     * Reports of the scenarios included in the story
     */
    scenarioReports: ScenarioReport[];

    /**
     * Reports of the groups where the story is included
     */
    groupReports: GroupReport[];
}
