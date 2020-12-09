import { StepDefinition } from "./StepDefinition";

export interface Block {
    _id?: any;
    owner?: any;
    name?: string;
    stepDefinitions: StepDefinition;
}