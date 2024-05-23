import {StepDefinition} from './StepDefinition';

/**
 * Interface of the Scenario
 */
export interface Scenario {

    /**
     * Number of scenario created in the story
     */
    scenario_id: number;

    /**
     * Name of the scenario
     */
    name: string;

    /**
     * Step definitions in the scenario
     */
    stepDefinitions: StepDefinition;

    /**
     * Comment in this scenario
     */
    comment: string;

    /**
     * If the last test was successfull or not
     */
    lastTestPassed?: boolean;

    /**
     * If the scenario got saved
     */
    saved?: boolean;

    /**
     * If the daisy Auto Logout is active
     */
    daisyAutoLogout?: boolean;

    /**
     * Wait time between the steps
     */
    stepWaitTime?: number;

    /**
     * Selected browser to execute the test on
     */
    browser?: string;

    /**
     * Selected emultaor to execute the test with
     */
    emulator?: string;
    /**
     * If scenario has a reference among a steps
     */
    hasRefBlock?: boolean;


    /**
     * Width of the window for the test
     */
    width?: number;

    /**
     * Height of the window for the test
     */

    height?: number;

    /**
     * Id of corresponding test run in xray
     */
    testRunSteps?: { testRunId: number; testRunStepId: number, testExecKey: string}[];

    /*
    * Xray test key
    */
    testKey?: String;
}
