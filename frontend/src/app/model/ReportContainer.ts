import { Report } from './Report';

/**
 * Interface of a Report container for the report history
 */
export interface ReportContainer {
    /**
     * Reports of the story
     */
    storyReports: Report[];

    /**
     * Reports of the scenarios included in the story
     */
    scenarioReports: Report[];

    /**
     * Reports of the groups where the story is included
     */
    groupReports: Report[];
}
