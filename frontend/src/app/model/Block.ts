import { StepDefinition } from "./StepDefinition";

/**
 * Interface of a block
 */
export interface Block {
    /**
     * Object id of the block from the database
     */
    _id?: any;

    /**
     * Creator of the block
     */
    owner?: any;//Note is this needed in the frontend?

    /**
     * Name of the block
     */
    name?: string;

    /**
     * Step definitions included in the block
     */
    stepDefinitions: StepDefinition;

    /**
     * Id of the repository which the block belongs to
     */
    repositoryId?: string;

    /**
     * Name of the repository which the block belongs to
     */
    repository?: string;//Note is this needed in the frontend?

    /**
     * Source of the repository the block belongs to
     */
    source?: string;// Note: Is this needed?

    isBackground?: Boolean
}