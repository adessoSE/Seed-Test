import { StepDefinitionBackground } from './StepDefinitionBackground';

/**
 * Interface of the Background 
 */
export interface Background {
    /**
     * Given name of the background
     */
    name?: string;

    /**
     * Stepdefinitions included in the background
     */
    stepDefinitions: StepDefinitionBackground;

    /**
     * If the background is saved
     */
    saved?: boolean;
}
