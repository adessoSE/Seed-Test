import { Component, OnInit, Input, ViewChild, EventEmitter, Output } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';


@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['./scenario-editor.component.css'],
})

export class ScenarioEditorComponent implements OnInit {

    originalStepTypes: StepType[];
    selectedStory: Story;
    selectedScenario: Scenario;
    arrowLeft = true;
    arrowRight = true;
    uncutInputs: string[] = [];

    @ViewChild('exampleChildView') exampleChild;

    constructor(
        public apiService: ApiService,
    ) {
        this.apiService.getBackendUrlEvent.subscribe(() => {
            this.loadStepTypes();
        });

        if (this.apiService.urlReceived) {
            this.loadStepTypes();
        }
    }


    ngOnInit() {
    }

    @Input()
    removeRowIndex(index: number) {
        this.removeStepFromScenario('example', index);
    }

    @Input()
    set newSelectedStory(story: Story) {
        this.selectedStory = story;
    }

    @Input()
    set newSelectedScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        if (this.selectedStory) {
            this.selectScenario(scenario);
        }

    }

    @Output()
    deleteScenarioEvent: EventEmitter<Scenario> = new EventEmitter();

    @Output()
    addScenarioEvent: EventEmitter<number> = new EventEmitter();

    @Output()
    runTestScenarioEvent: EventEmitter<any> = new EventEmitter();

    @Output()
    formtosubmit: EventEmitter<any> = new EventEmitter();

    chooseform(list) {
        this.formtosubmit.emit(list);
    }

    onDropScenario(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
        /*if (!this.editorLocked) {*/
        moveItemInArray(this.getStepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
        /*}*/
    }

    getStepsList(stepDefs: StepDefinition, i: number) {
        if (i == 0) {
            return stepDefs.given;
        } else if (i == 1) {
            return stepDefs.when;
        } else if (i == 2) {
            return stepDefs.then;
        } else {
            return stepDefs.example;
        }
    }

    getKeysList(stepDefs: StepDefinition) {
        if (stepDefs != null) {
            return Object.keys(stepDefs);
        } else {
            return '';
        }
    }

    loadStepTypes() {
        this.apiService
            .getStepTypes()
            .subscribe((resp: StepType[]) => {
                this.originalStepTypes = resp;
            });
    }


    updateScenario(storyID: number) {
        let steps = this.selectedScenario["stepDefinitions"]["given"];
        steps = steps.concat(this.selectedScenario["stepDefinitions"]["when"]);
        steps = steps.concat(this.selectedScenario["stepDefinitions"]["then"]);

        let undefined_steps = [];
        for (let i = 0; i < steps.length; i++) {
            if (String(steps[i]["type"]).includes("Undefined Step")) {
                undefined_steps = undefined_steps.concat(steps[i]);
            }
        }

        if (undefined_steps.length != 0) {
            console.log("There are undefined steps here");
        }

        this.apiService
            .updateScenario(storyID, this.selectedScenario)
            .subscribe(resp => {
            });
    }

    addScenarioToStory(storyID: number) {
        this.addScenarioEvent.emit(storyID);

    }

    deleteScenario(event){
        console.log('scenario editor delete scenario')
        this.deleteScenarioEvent.emit(this.selectedScenario);
    }

    addStepToScenario(storyID: number, step) {
        const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions);
        switch (newStep.stepType) {
            case 'given':
                this.selectedScenario.stepDefinitions.given.push(newStep);
                break;
            case 'when':
                this.selectedScenario.stepDefinitions.when.push(newStep);
                break;
            case 'then':
                this.selectedScenario.stepDefinitions.then.push(newStep);
                break;
            case 'example':
                this.addExampleStep(step);
                break;
            default:
                break;
        }
    }

    addExampleStep(step: StepType){
        if (this.selectedScenario.stepDefinitions.example.length > 0) {
            this.addStep(step);
            const len = this.selectedScenario.stepDefinitions.example[0].values.length;
            for (let j = 1; j < len; j++) {
                this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
            }
            this.exampleChild.updateTable();
        }  
    }

    createNewStep(step: StepType, stepDefinitions: StepDefinitionBackground): StepType{
        const obj = this.clone(step);
        const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
        const newStep: StepType = {
            id: newId,
            mid: obj.mid,
            pre: obj.pre,
            stepType: obj.stepType,
            type: obj.type,
            values: obj.values
        };
        return newStep;
    }

    addStep(step: StepType) {
        const new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, step.stepType) + 1;
        const new_step: StepType = {
            id: new_id,
            mid: step.mid,
            pre: step.pre,
            stepType: 'example',
            type: step.type,
            values: ['value']
        };
        this.selectedScenario.stepDefinitions.example.push(new_step);
    }

    getLastIDinStep(stepDefs: any, stepStepType: string): number {
        switch (stepStepType) {
            case 'given':
                return this.buildID(stepDefs.given);
            case 'when':
                return this.buildID(stepDefs.when);
            case 'then':
                return this.buildID(stepDefs.then);
            case 'example':
                return this.buildID(stepDefs.example);
        }
    }

    buildID(step): number {
        if (step.length !== 0) {
            return step[step.length - 1].id;
        } else {
            return 0;
        }
    }

    removeStepFromScenario(stepStepType: string, index: number) {
        switch (stepStepType) {
            case 'given':
                this.selectedScenario.stepDefinitions.given.splice(index, 1);
                break;
            case 'when':
                this.selectedScenario.stepDefinitions.when.splice(index, 1);
                break;
            case 'then':
                this.selectedScenario.stepDefinitions.then.splice(index, 1);
                break;
            case 'example':
                this.selectedScenario.stepDefinitions.example.splice(index, 1);
                this.exampleChild.updateTable();
                break;
        }
    }

    addToValues(input: string, stepType: string, step: StepType, stepIndex: number, valueIndex: number) {
        this.checkForExamples(input, step, valueIndex);
        switch (stepType) {
            case 'given':
                this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = input;
                break;
            case 'when':
                this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = input;
                break;
            case 'then':
                this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = input;
                break;
            case 'example':
                this.selectedScenario.stepDefinitions.example[stepIndex].values[valueIndex] = input;
                break;
        }
    }


    checkForExamples(input: string, step: StepType, valueIndex: number) {
        // removes example if new input is not in example syntax < >
        if (this.inputRemovedExample(input, step, valueIndex)) {
            this.removeExample(step, valueIndex);
        }
        // if input has < > and it is a new unique input
        if (this.inputHasExample(input, step, valueIndex)) {
            this.createExample(input, step, valueIndex);
        }
    }

    inputRemovedExample(input: string, step: StepType, valueIndex: number): boolean{
        return step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && !input.startsWith('<') && !input.endsWith('>')
    }

    inputHasExample(input: string, step: StepType, valueIndex: number): boolean{
        return input.startsWith('<') && input.endsWith('>') && (this.selectedScenario.stepDefinitions.example[0] == undefined || !this.uncutInputs.includes(input))
    }

    createExample(input: string, step: StepType, valueIndex: number){
        this.uncutInputs.push(input);
        const cutInput = input.substr(1, input.length - 2);
        this.handleExamples(input, cutInput, step, valueIndex);
    }

    removeExample(step: StepType, valueIndex: number){
        const cutOld = step.values[valueIndex].substr(1, step.values[valueIndex].length - 2);
        this.uncutInputs.splice(this.uncutInputs.indexOf(step.values[valueIndex]), 1);

        for (let i = 0; i < this.selectedScenario.stepDefinitions.example.length; i++) {
            this.selectedScenario.stepDefinitions.example[i].values.splice(this.selectedScenario.stepDefinitions.example[0].values.indexOf(cutOld), 1);
            if (this.selectedScenario.stepDefinitions.example[0].values.length == 0) {
                this.selectedScenario.stepDefinitions.example.splice(0, this.selectedScenario.stepDefinitions.example.length);
            }
        }
        if(!this.selectedScenario.stepDefinitions.example || this.selectedScenario.stepDefinitions.example.length <= 0){
            let table = document.getElementsByClassName('mat-table')[0];
            table.classList.remove('mat-elevation-z8')
        }
    }


    handleExamples(input: string, cutInput: string, step: StepType, valueIndex: number) {
        // changes example header name if the name is just changed in step
        if (this.exampleHeaderChanged(input, step, valueIndex)) {
            this.selectedScenario.stepDefinitions.example[0].values[this.selectedScenario.stepDefinitions.example[0].values.indexOf(step.values[valueIndex].substr(1, step.values[valueIndex].length - 2))] = cutInput;
            return;
        }
        // for first example creates 2 steps
        if (this.selectedScenario.stepDefinitions.example[0] === undefined) {
            this.createFirstExample(cutInput, step);
        } else {
            // else just adds as many values to the examples to fill up the table
            this.fillExamples(cutInput, step);
        }
        this.exampleChild.updateTable();
    }

    createFirstExample(cutInput: string, step: StepType){
        for (let i = 0; i <= 2; i++) {
            this.addStep(step);
            this.exampleChild.updateTable();
        }
        this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
        let table = document.getElementsByClassName('mat-table')[0];
        if(table) table.classList.add('mat-elevation-z8')
    }

    fillExamples(cutInput: string, step: StepType){
        this.selectedScenario.stepDefinitions.example[0].values.push(cutInput);

            for (let j = 1; j < this.selectedScenario.stepDefinitions.example.length; j++) {
                this.selectedScenario.stepDefinitions.example[j].values.push('value');
            }
            // if the table has no rows add a row
            if (this.selectedScenario.stepDefinitions.example[1] === undefined) {
                this.addStep(step);
                const len = this.selectedScenario.stepDefinitions.example[0].values.length;
                for (let j = 1; j < len; j++) {
                    this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
                }
            }
    }


    exampleHeaderChanged(input: string, step: StepType, valueIndex: number): boolean{
        return step.values[valueIndex] != input && step.values[valueIndex] != '' && step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && this.selectedScenario.stepDefinitions.example[valueIndex] !== undefined
    }

    renameScenario(event, name) {
        if (name) {
            this.selectedScenario.name = name;
        }
    }

    selectScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        this.arrowLeft = this.checkArrowLeft();
        this.arrowRight = this.checkArrowRight();
    }

    checkArrowLeft(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex - 1] === undefined;
    }

    checkArrowRight(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex + 1] === undefined;
    }

    scenarioShiftLeft() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex - 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex - 1]);
        }
    }

    scenarioShiftRight() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex + 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex + 1]);
        }
    }

    runTestScenario(storyId: number, scenarioId: number){
        this.runTestScenarioEvent.emit({storyId, scenarioId})
    }

    undefined_definition(definition){
        let undefined_list = [];
        if(definition !== undefined){
            let given = definition["given"];
            for(let key in given){
                let obj = given[key];
                if (obj["type"] === "Undefined Step"){
                    undefined_list = undefined_list.concat(obj["values"][0]);
                }
            }
            let then = definition["then"];
            for(let key in then){
                let obj = then[key];
                if (obj["type"] === "Undefined Step"){
                    undefined_list = undefined_list.concat(obj["values"][0]);
                }
            }
            let when = definition["when"];
            for(let key in when){
                let obj = when[key];
                if (obj["type"] === "Undefined Step"){
                    undefined_list = undefined_list.concat(obj["values"][0]);
                }
            }
        }
        return undefined_list;
    }

    
    // To bypass call by reference of object properties
    // therefore new objects are created and not the existing object changed
    clone(obj) {
        if (obj == null || typeof (obj) != 'object') {
            return obj;
        }
        const temp = new obj.constructor();
        for (var key in obj) {
            temp[key] = this.clone(obj[key]);
        }

        return temp;
    }


}
