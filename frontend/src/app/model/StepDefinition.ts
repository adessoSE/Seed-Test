import { StepType } from './StepType';

/**
 * Interface of a Step definition
 */
export interface StepDefinition {
    /**
     * Given Steps
     */
    given: StepType[];

    /**
     * When Steps
     */
    when: StepType[];

    /**
     * Then Steps
     */
    then: StepType[];

    /**
     * Examples
     */
    example: StepType[];
}
