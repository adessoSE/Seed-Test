/**
 * Interface of a Multiple Scenario
 */
export interface MultipleScenario{

    /**
    * example key/name
    */
    key: string;

    /**
     * example value
     */
    values: string[];

    /**
     * checked 
     */
    checked?: boolean;

    /**
     * deactivated currently not used
     */
    deactivated?: boolean;
}
