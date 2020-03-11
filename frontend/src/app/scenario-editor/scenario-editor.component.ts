
import { Component, OnInit, Input, ViewChild, EventEmitter, Output } from '@angular/core';
import { ApiService } from '../Services/api.service';
import {saveAs} from 'file-saver';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';

const emptyBackground = {name, stepDefinitions: {when: []}};

@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['./scenario-editor.component.css'],
})

export class ScenarioEditorComponent implements OnInit {

    stories: Story[];
    originalStepTypes: StepType[];
    selectedStory: Story;
    selectedScenario: Scenario;
    showEditor = false;
    showResults = false;
    /*editorLocked = true;*/
    /*backgroundLocked = true;*/
    showDescription = false;
    showBackground = false;
    arrowLeft = true;
    arrowRight = true;
    testDone = false;
    testRunning = false;
    uncutInputs: string[] = [];
    htmlReport;
    storiesLoaded = false;

    @ViewChild('exampleChildView') exampleChild;

    constructor(
        public apiService: ApiService,
    ) {
        this.apiService.getStoriesEvent.subscribe(stories => {
            this.storiesLoaded = true;
            this.showEditor = false;
            this.setStories(stories);
        });
        this.apiService.getBackendUrlEvent.subscribe(() => {
            this.loadStepTypes();
        });

        if (this.apiService.urlReceived) {
            this.loadStepTypes();
        }
    }


    ngOnInit() {
    }

    setStories(stories: Story[]) {
        this.stories = stories;
    }

    @Input()
    removeRowIndex(event) {
        this.removeStepToScenario('example', event);
    }

    @Input()
    set newSelectedStory(story: Story) {
        this.selectedStory = story;
    }

    @Input()
    set newSelectedScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        if (this.stories && this.selectedStory) {
            this.selectScenario(null, scenario);
        }

    }

    @Output()
    formtosubmit: EventEmitter<any> = new EventEmitter();

    chooseform(list) {
        this.formtosubmit.emit(list);
    }

    onDropScenario(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
        /*if (!this.editorLocked) {*/
        moveItemInArray(this.stepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
        /*}*/
    }

    onDropBackground(event: CdkDragDrop<any>, stepDefs: StepDefinition) {
        /*if (!this.backgroundLocked) {*/
        moveItemInArray(this.backgroundList(stepDefs), event.previousIndex, event.currentIndex);
        /*}*/
    }

    backgroundList(stepDefinitions: StepDefinitionBackground) {
        return stepDefinitions.when;
    }

    stepsList(stepDefs: StepDefinition, i: number) {
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

    keysList(stepDefs) {
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


    backgroundNameChange(name: string) {
        this.selectedStory.background.name = name;
    }

    updateBackground(storyID) {
        this.apiService
            .updateBackground(storyID, this.selectedStory.background)
            .subscribe(resp => {
            });

    }

    updateScenario(storyID) {
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

    addScenarioFromStory(storyID) {
        this.apiService
            .addScenario(storyID)
            .subscribe((resp: any) => {
                this.stories[this.stories.indexOf(this.selectedStory)].scenarios.push(resp);
                this.selectScenario(resp.story_id, resp);
            });

    }

    addScenario(storyID) {
        this.apiService
            .addScenario(storyID)
            .subscribe((resp: any) => {
                this.stories[this.stories.indexOf(this.selectedStory)].scenarios.push(resp);
            });
    }

    deleteBackground() {
        this.apiService
            .deleteBackground(this.selectedStory.story_id)
            .subscribe(resp => {
                this.showBackground = false;

                const indexStory: number = this.stories.indexOf(this.selectedStory);
                this.stories[indexStory].background = emptyBackground;
            });
    }

    deleteScenario(event) {
        this.apiService
            .deleteScenario(this.selectedStory.story_id, this.selectedScenario)
            .subscribe(resp => {
                this.showEditor = false;

                const indexStory: number = this.stories.indexOf(this.selectedStory);
                const indexScenario: number = this.stories[indexStory].scenarios.indexOf(this.selectedScenario);
                if (indexScenario !== -1) {
                    this.stories[indexStory].scenarios.splice(indexScenario, 1);
                }
            });
    }

    openDescription() {
        this.showDescription = !this.showDescription;
    }

    openBackground() {
        this.showBackground = !this.showBackground;
    }


    addStepToScenario(storyID, step) {
        const obj = this.clone(step);
        /*if (!this.editorLocked) {*/
        const new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, obj.stepType) + 1;
        const new_step = {
            id: new_id,
            mid: obj.mid,
            pre: obj.pre,
            stepType: obj.stepType,
            type: obj.type,
            values: obj.values
        };
        switch (new_step.stepType) {
            case 'given':
                this.selectedScenario.stepDefinitions.given.push(new_step);
                break;
            case 'when':
                this.selectedScenario.stepDefinitions.when.push(new_step);
                break;
            case 'then':
                this.selectedScenario.stepDefinitions.then.push(new_step);
                break;
            case 'example':
                if (this.selectedScenario.stepDefinitions.example.length > 0) {
                    this.addStep(step);
                    const len = this.selectedScenario.stepDefinitions.example[0].values.length;
                    for (let j = 1; j < len; j++) {
                        this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
                    }
                    this.exampleChild.updateTable();
                }
                break;
            default:
                break;
        }
        /*}*/
    }

    addStepToBackground(storyID, step) {
        const obj = this.clone(step);

        /*if (!this.backgroundLocked) {*/
        const new_id = this.getLastIDinStep(this.selectedStory.background.stepDefinitions, obj.stepType) + 1;
        const new_step = {
            id: new_id,
            label: obj.label,
            mid: obj.mid,
            pre: obj.pre,
            stepType: obj.stepType,
            type: obj.type,
            values: obj.values
        };
        if (new_step.stepType == 'when') {
            this.selectedStory.background.stepDefinitions.when.push(new_step);
        }
        /*}*/
    }

    addStep(step) {
        const new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, step.stepType) + 1;
        const new_step = {
            id: new_id,
            label: step.label,
            mid: step.mid,
            pre: step.pre,
            stepType: 'example',
            type: step.type,
            values: ['value']
        };
        this.selectedScenario.stepDefinitions.example.push(new_step);
    }

    getLastIDinStep(stepDefs, stepType) {
        switch (stepType) {
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

    buildID(stepType): number {
        if (stepType.length !== 0) {
            return stepType[stepType.length - 1].id;
        } else {
            return 0;
        }
    }

    removeStepToBackground(event, index) {
        this.selectedStory.background.stepDefinitions.when.splice(index, 1);
    }

    removeStepToScenario(stepDefType, index) {
        switch (stepDefType) {
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

    addToValuesBackground(input: string, stepIndex, valueIndex) {
        this.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex] = input;
    }

    addToValues(input: string, stepType, step, stepIndex, valueIndex) {
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


    checkForExamples(input, step, valueIndex) {
        // removes example if new input is not in example syntax < >
        if (step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') &&
            !input.startsWith('<') && !input.endsWith('>')) {
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
        // if input has < > and it is a new unique input
        if (input.startsWith('<') && input.endsWith('>') && (this.selectedScenario.stepDefinitions.example[0] == undefined || !this.uncutInputs.includes(input))) {
            this.uncutInputs.push(input);
            const cutInput = input.substr(1, input.length - 2);
            this.handleExamples(input, cutInput, step, valueIndex);
        }
    }

    handleExamples(input, cutInput, step, valueIndex) {
        // changes example header name if the name is just changed in step
        if (step.values[valueIndex] != input && step.values[valueIndex] != '' && step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && this.selectedScenario.stepDefinitions.example[valueIndex] !== undefined) {
            this.selectedScenario.stepDefinitions.example[0].values[this.selectedScenario.stepDefinitions.example[0].values.indexOf(step.values[valueIndex].substr(1, step.values[valueIndex].length - 2))] = cutInput;
            return;
        }
        // for first example creates 2 steps
        if (this.selectedScenario.stepDefinitions.example[0] === undefined) {
            for (let i = 0; i <= 2; i++) {
                this.addStep(step);
                this.exampleChild.updateTable();
            }
            this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
            let table = document.getElementsByClassName('mat-table')[0];
            if(table) table.classList.add('mat-elevation-z8')
        } else {
            // else just adds as many values to the examples to fill up the table
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
        this.exampleChild.updateTable();
    }

    renameScenario(event, name) {
        if (name) {
            this.selectedScenario.name = name;
        }
    }

    /*lockBackground() {
      this.backgroundLocked = !this.backgroundLocked;
    }*/

    /*lockEditor() {
      this.editorLocked = !this.editorLocked;
    }*/

    selectScenario(storyID, scenario: Scenario) {
        this.selectedScenario = scenario;
        this.showResults = false;
        this.showEditor = true;
        /*this.editorLocked = true;*/
        this.testDone = false;
        this.arrowLeft = this.checkArrowLeft();
        this.arrowRight = this.checkArrowRight();
    }


    selectStoryScenario(story: Story) {
        this.showResults = false;
        this.selectedStory = story;
        this.showEditor = true;
        /*this.editorLocked = true;*/
        const storyIndex = this.stories.indexOf(this.selectedStory);
        if (this.stories[storyIndex].scenarios[0] !== undefined) {
            this.selectScenario(this.selectedStory.story_id, this.stories[storyIndex].scenarios[0]);
        }
    }

    checkArrowLeft() {
        const storyIndex = this.stories.indexOf(this.selectedStory);
        const scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);
        return this.stories[storyIndex].scenarios[scenarioIndex - 1] === undefined;
    }

    checkArrowRight() {
        const storyIndex = this.stories.indexOf(this.selectedStory);
        const scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);
        return this.stories[storyIndex].scenarios[scenarioIndex + 1] === undefined;
    }

    scenarioShiftLeft() {
        const storyIndex = this.stories.indexOf(this.selectedStory);
        const scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);
        if (this.stories[storyIndex].scenarios[scenarioIndex - 1] !== undefined) {
            this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex - 1]);
        }
    }

    scenarioShiftRight() {
        const storyIndex = this.stories.indexOf(this.selectedStory);
        const scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);
        if (this.stories[storyIndex].scenarios[scenarioIndex + 1] !== undefined) {
            this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex + 1]);
        }
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

    // Make the API Request to run the tests and display the results as a chart
    runTests(story_id, scenario_id, callback) {
        let undefined_list = this.undefined_definition(this.selectedScenario["stepDefinitions"]);


        if(undefined_list.length > 0){
            this.chooseform(undefined_list);
        }
        else {
            this.testRunning = true;
            const iframe: HTMLIFrameElement = document.getElementById('testFrame') as HTMLIFrameElement;
            const loadingScreen: HTMLElement = document.getElementById('loading');
            loadingScreen.scrollIntoView();
            this.apiService
                .runTests(story_id, scenario_id)
                .subscribe(resp => {
                    iframe.srcdoc = resp;
                    // console.log("This is the response: " + resp);
                    this.htmlReport = resp;
                    this.testDone = true;
                    this.showResults = true;
                    this.testRunning = false;
                    setTimeout(function () {
                        iframe.scrollIntoView();
                    }, 10);
                });
        }

    }

    downloadFile() {
        const blob = new Blob([this.htmlReport], {type: 'text/html'});
        saveAs(blob);
    }

    hideResults() {
        this.showResults = !this.showResults;
    }

    compareFunction(a: number, b: number) {
        return a - b;
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
