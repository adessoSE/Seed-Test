import { StoryReport } from './StoryReport';
import {ScenarioReport} from './ScenarioReport';
import {GroupReport} from './GroupReport';

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
