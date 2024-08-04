/**
 * Interface of a Multiple Scenario
 */
export interface MultipleScenario{

    /**
     * example value
     */
    values: string[];

    /**
     * checked 
     */
    checked?: boolean;

    /**
     * deactivate scenario(the entire row)
     */
    deactivated?: boolean;
}
