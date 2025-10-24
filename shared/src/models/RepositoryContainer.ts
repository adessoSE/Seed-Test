
export interface AiConfig {
  provider: 'local' | 'cloud';
  endpointUrl?: string;
  apiKey?: string;
  defaultTextModel?: string;
  defaultJsonModel?: string;
}


/**
 * Interface for displaying a repository in a list (View Model / DTO).
 */
export interface RepositoryContainer {
    /**
     * Object id of the repository container from the database
     */
    _id?: any;

    /**
     * Name of the repository
     */
    repoName: string;

    /**
     * Source of the repository
     */
    source: string;

    /**
     * If the user can edit the repository
     */
    canEdit?: boolean;

    /**
     * Global settings for the repository
     */
    settings?: {
        stepWaitTime?: number;
        reportComment?: boolean;
        browser?: string;
        testRunner?: string;
        emulator?: string;
        width?: number;
        height?: number;
        activated?: boolean;
    };

    /**
     * Determines how our AI generation is configured
     */

    aiConfig?: AiConfig;

}
