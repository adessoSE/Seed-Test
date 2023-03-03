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
     * If the user can edit the repository
     */
    selectedToTransfer?: boolean;
}
