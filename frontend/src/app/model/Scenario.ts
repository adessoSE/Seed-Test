import {StepDefinition} from './StepDefinition'


export interface Scenario{
    scenario_id: number;
    name: string;
    stepDefinitions: StepDefinition;
}