/**
 * Configuration for a single AI provider (text or json).
 */
export interface AiProviderConfig {
    /**
     * The provider type, currently 'custom' is the only one used. (for now)
     */
    provider: 'custom';
    /**
     * In our case: The name of the provider, e.g., 'local' or 'cloud'.
     */
    name: 'local' | 'cloud';
    /**
     * The name of the model to use (e.g., 'gpt-4', 'llama3').
     */
    modelName: string;
    /**
     * The base URL for the API endpoint (e.g., Ollama URL).
     */
    baseURL: string;
    /**
     * The API key. This will be stored encrypted in the database.
     */
    apiKey?: string;
}
/**
 * The main AI configuration, separating text generation from JSON conversion.
 */
export interface AiConfig {
    textPreparation: AiProviderConfig;
    jsonConversion: AiProviderConfig;
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
     * Determines how our AI generation is configured using the structured config.
     */
    aiConfig?: AiConfig;
}
//# sourceMappingURL=RepositoryContainer.d.ts.map