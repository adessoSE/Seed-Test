import { MultipleScenario } from "./MuiltipleScenario";
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
    owner?: any;

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
    repository?: string;

    /**
     * Source of the repository the block belongs to
     */
    source?: string;  
    /**
     * If block was saved as a background 
     */
    isBackground ?: boolean;
    /**
     * If the block is used as a reference
     */
    usedAsReference?: boolean;

    multipleScenarios?: MultipleScenario[];

}