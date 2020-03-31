import { StepType } from "./StepType";

export interface StepDefinition {
    given: StepType[];
    when: StepType[];
    then: StepType[];
    example: StepType[];
}
