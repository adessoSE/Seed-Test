/**
 * Interface of the step type
 */
export interface StepType {
     /**
     * Object id of the reference block step / determine whether the step is a reference
     */
    _blockReferenceId?: string;

    /**
     * Importance of the step type, the lower, the higher the importance -> the higher the step is the higher ordered it is in the list of available steps
     */
    id: number;

    /**
     * Text before the first input field
     */
    pre: string;

    /**
     * Text after the first input field
     */
    mid: string;

    /**
     * Text after the second input field (text at end of step)
     */
    post: string;

    /**
     * Selection currently not used
     */
    selection?: [];

    /**
     * SelectionValue currently not used
     */
    selectionValue?: number;

    /**
     * Name of the type to which this step belongs to: given, when, then
     */
    stepType: string;

    /**
     * Name shown to the user in the available steps list
     */
    type: string;

    /**
     * List of values to fill the input fields
     */
    values: string[];

    /**
     * List of booleans defining if value is a example. Not defined in Blocks.
     */
    isExample?: boolean[];

    /**
     * Outdated currently not used
     */
    outdated?: boolean;

    /**
     * checked 
     */
    checked?: boolean;

    /**
     * deactivated currently not used
     */
    deactivated?: boolean;
    
    /**
     * if block reference is expanded in scenario
     */
    blockStepExpanded?: boolean;

}
