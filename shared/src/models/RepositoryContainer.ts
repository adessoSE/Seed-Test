
export interface AiConfig {
  provider: 'local' | 'cloud';
  endpointUrl?: string;
  apiKey?: string;
  defaultTextModel?: string;
  defaultJsonModel?: string;
}


/**
 * Interface of the repository container
 */
export interface RepositoryContainer {
    /**
     * Object id of the repository container from the database
     */
    _id?: any;

    /**
     * Name of the repository
     */
    value: string;

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
