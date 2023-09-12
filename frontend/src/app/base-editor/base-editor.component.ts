import { ApiService } from 'src/app/Services/api.service';
import { CdkDragDrop, CdkDragStart, DragRef, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChild, ViewChildren, ViewEncapsulation } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AddBlockFormComponent } from '../modals/add-block-form/add-block-form.component';
import { NewStepRequestComponent } from '../modals/new-step-request/new-step-request.component';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { Block } from '../model/Block';
import { Scenario } from '../model/Scenario';
import { StepDefinition } from '../model/StepDefinition';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import { StepType } from '../model/StepType';
import { Story } from '../model/Story';
import { BlockService } from '../Services/block.service';
import { Subscription } from 'rxjs';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { NewExampleComponent } from '../modals/new-example/new-example.component';
import { ExampleService } from '../Services/example.service';
import { ScenarioService } from '../Services/scenario.service';
import { StoryService } from '../Services/story.service';
import { BackgroundService } from '../Services/background.service';
import { InfoWarningToast } from '../info-warning-toast';
import { EditBlockComponent } from '../modals/edit-block/edit-block.component';
import { DeleteToast } from '../delete-toast';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-base-editor',
  templateUrl: './base-editor.component.html',
  styleUrls: ['./base-editor.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class BaseEditorComponent {

  @ViewChildren('step_type_input') step_type_input: QueryList<ElementRef>;

  @ViewChildren('step_type_input1') step_type_input1: QueryList<ElementRef>;

  /**
    * View child of the example table
    */
  @ViewChildren('exampleChildView') exampleChildren: QueryList<ExampleTableComponent>;

  /**
    * View child of the modals component
    */
  @ViewChild('saveBlockModal') saveBlockModal: SaveBlockFormComponent;
  @ViewChild('addBlockModal') addBlockModal: AddBlockFormComponent;
  @ViewChild('newStepRequest') newStepRequest: NewStepRequestComponent;
  @ViewChild('newExampleModal') newExampleModal: NewExampleComponent;
  @ViewChild('editBlockModal') editBlockModal: EditBlockComponent;



  selectedStory: Story;

  @Input() originalStepTypes: StepType[];

  @Input() templateName: string;

  /**
    * If the test is running
    */
  @Input() testRunning: boolean;

  @Input() selectedBlock: Block;

  /**
    * Sets a new selected scenaio
    */
  @Input()
  set newlySelectedScenario(scenario: Scenario) {
    if (this.selectedScenario) {
      this.checkAllSteps(false);
    }
    this.selectedScenario = scenario;
  }

  @Input()
  set uncheckBackgroundCheckboxes(showBackground) {
    if (showBackground) {
      this.checkAllSteps(false);
    }
  }

  /**
    * Sets a new selected story
    */
  @Input()
  set newlySelectedStory(story: Story) {
    this.selectedStory = story;
  }

  /**
    * Checks for an example step
    * @param index
    */
  @Input()
  checkRowIndex(index: number) {
    this.checkStep(this.selectedScenario.stepDefinitions.example[index]);
  }

  @Output("blockSelectTriggerEvent") blockSelectTriggerEvent: EventEmitter<string> = new EventEmitter();

  /**
     * Subscribtions for all EventEmitter
     */
  expandStepBlock = false;

  /**
    * currently selected scenario
    */
  selectedScenario: Scenario;

  /**
  * Name for a new step
  */
  newStepName = 'New Step';

  saved = true;

  modalReference: NgbModalRef;

  lastToFocus;

  /**
  * If the action bar is active
  */
  activeActionBar = false;

  /**
    * inputs including the <> for the examples
    */
  uncutInputs: string[] = [];

  /**
  * If all steps are checked
  */
  allChecked = false;

  lastVisitedTemplate: string = '';
  lastCheckedCheckboxIDx;

  /**
  * Flag to check how much enable steps left
  */
  activatedSteps = 0;
  /**
 * If all examples steps are deactivated
 */
  allDeactivated: boolean;
  /**
* If selected steps is a reference block
*/
  isReferenceBlock: boolean;
  /**
    * Block saved to clipboard
    */
  clipboardBlock: Block = null;

  indexOfExampleToDelete;

  dragging: DragRef = null;

  exampleChild: ExampleTableComponent;

  /**
    * Subscribtions for all EventEmitter
    */
  newExampleObservable: Subscription;
  renameExampleObservable: Subscription;
  addBlocktoScenarioObservable: Subscription;
  scenarioChangedObservable: Subscription;
  backgroundChangedObservable: Subscription;
  copyExampleOptionObservable: Subscription;


  constructor(public toastr: ToastrService,
    public blockService: BlockService,
    public exampleService: ExampleService,
    public scenarioService: ScenarioService,
    public backgroundService: BackgroundService,
    public apiService: ApiService) { }

  ngOnInit(): void {
    this.addBlocktoScenarioObservable = this.blockService.addBlockToScenarioEvent.subscribe(block => {
      if (this.templateName == 'background' && block[0] == 'background') {
        //block = block[1];
        Object.keys(block[1].stepDefinitions).forEach((key, _) => {
          if (key === 'when') {
            block[1].stepDefinitions[key].forEach((step: StepType) => {
              this.selectedStory.background.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
            });
          }
        });
        this.markUnsaved();
      }
      if (this.templateName == 'scenario' && block[0] == 'scenario') {
        if (block[2]) {
          const blockReference: StepType = {
            _blockReferenceId: block[1]._id, id: 0, type: block[1].name, stepType: 'when',
            pre: '', mid: '', post: '', values: []
          };
          this.selectedScenario.stepDefinitions.when.push(JSON.parse(JSON.stringify(blockReference)));
        } else {
          block = block[1];
          this.insertStepsWithExamples(block);
        }
        this.markUnsaved();
      }

    });

    this.newExampleObservable = this.exampleService.newExampleEvent.subscribe(value => { this.addToValues(value.name, 0, 0, 'addingExample', value.step) });
    this.renameExampleObservable = this.exampleService.renameExampleEvent.subscribe(value => { this.renameExample(value.name, value.column); });
    this.scenarioChangedObservable = this.scenarioService.scenarioChangedEvent.subscribe(() => {
      this.checkAllSteps(false);
    });
    this.backgroundChangedObservable = this.backgroundService.backgroundChangedEvent.subscribe(() => {
      this.checkAllSteps(false);
    });

    this.copyExampleOptionObservable = this.apiService.copyStepWithExampleEvent.subscribe(option => {
      if (this.clipboardBlock) {
        if (option == 'copy') {
          this.insertStepsWithExamples(this.clipboardBlock)
        } else if (option == 'dontCopy') {
          this.insertStepsWithoutExamples()
        }
      }
  });  
  }

  ngOnDestroy(): void {
    if (!this.addBlocktoScenarioObservable.closed) {
      this.addBlocktoScenarioObservable.unsubscribe();
    }
    if (!this.newExampleObservable.closed) {
      this.newExampleObservable.unsubscribe();
    }
    if (!this.renameExampleObservable.closed) {
      this.renameExampleObservable.unsubscribe();
    }
    if (!this.scenarioChangedObservable.closed) {
      this.scenarioChangedObservable.unsubscribe();
    }
    if (!this.backgroundChangedObservable.closed) {
      this.backgroundChangedObservable.unsubscribe();
    }
    if (!this.copyExampleOptionObservable.closed) {
      this.copyExampleOptionObservable.unsubscribe();
    }

  }

  /**
    * retrieves the saved block from the session storage
    */
  ngDoCheck(): void {
    switch (this.templateName) {
      case 'background':
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('scenarioBlock'));
        break;

      case 'scenario':
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('scenarioBlock'));
        break;

      case 'example':
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedExampleBlock'));
        break;

      default:
        break;
    }
    if (this.allChecked) {
      this.checkAllSteps(this.allChecked);
    }
  }

  ngAfterViewInit(): void {
    this.step_type_input.changes.subscribe(_ => {
      this.step_type_input.forEach(in_field => {
        if (in_field.nativeElement.id === this.lastToFocus) {
          in_field.nativeElement.focus();
        }
      });
      this.lastToFocus = '';
    });
    this.step_type_input1.changes.subscribe(_ => {
      this.step_type_input1.forEach(in_field => {
        if (in_field.nativeElement.id === this.lastToFocus) {
          in_field.nativeElement.focus();
        }
      });
      this.lastToFocus = '';
    });

    if (this.exampleChildren.last != undefined) {
      this.exampleChild = this.exampleChildren.last;
    }
  }

  /**
   * Fills example values
   * @param stepType 
   * @param index 
   * @param step 
   */

  fillExapleValues(stepType, index, step) {
    if (!this.selectedScenario.stepDefinitions[stepType][0] || !this.selectedScenario.stepDefinitions[stepType][0].values.some(r => step.values.includes(r))) {
      this.selectedScenario.stepDefinitions[stepType].push(JSON.parse(JSON.stringify(step)));
    }
    if (index == 0) {
      step.values.forEach(el => {
        const s = '<' + el + '>';
        if (!this.uncutInputs.includes(s)) {
          this.uncutInputs.push(s);
        }
      });
    }

  }



  /**
   * Adds a value to the step
    * @param input
    * @param stepIndex
    * @param valueIndex
    * @param stepType
    * @param step Optional argument
    */
  addToValues(input: string, stepIndex: number, valueIndex: number, stepType: string, step?: StepType) {
    switch (this.templateName) {
      case 'background':
        this.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex] = input;
        this.markUnsaved();
        break;
      case 'scenario':
        //updates scenario steps 
        this.updateScenarioValues(input, stepIndex, valueIndex, stepType);
        this.markUnsaved();
        break;
      case 'example':
        if (stepType == 'addingExample') {
          this.handleExamples(input, step);
          this.markUnsaved();
        }
        break;
    }
  }

  addToValuesBlock(input: string, stepIndex: number, valueIndex: number) {
    this.selectedBlock.stepDefinitions.when[stepIndex].values[valueIndex] = input;
    this.markUnsaved();
    console.log("Current Block after added Value:");
    console.log(this.selectedBlock);
  }

  /**
    * Updates input values of scenario step types
    * @param input
    * @param stepIndex
    * @param valueIndex
    * @param stepType
    */
  updateScenarioValues(input: string, stepIndex: number, valueIndex: number, stepType: string) {
    switch (stepType) {
      case 'given':
        if (this.selectedScenario.stepDefinitions.given[stepIndex].isExample[valueIndex]) {
          this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = '<' + input + '>';
        }
        else {
          this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = input;
        }
        break;
      case 'when':
        if (this.selectedScenario.stepDefinitions.when[stepIndex].isExample[valueIndex]) {
          this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = '<' + input + '>';
        }
        else {
          this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = input;
        }
        break;
      case 'then':
        if (this.selectedScenario.stepDefinitions.then[stepIndex].isExample[valueIndex]) {
          this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = '<' + input + '>';
        }
        else {
          this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = input;
        }
        break;
      case 'example':
        this.selectedScenario.stepDefinitions.example[stepIndex].values[valueIndex] = input;
        this.markUnsaved();
    }

  }

  /**
    * Adds step
    * @param step 
    * @param selectedScenario 
    * @param templateName
    * @param step_idx Optional argument
    */
  addStep(step: StepType, selectedScenario: any, templateName, step_idx?: any) {
    let lastEl;
    let newStep;
    if (templateName == 'background') {
      newStep = this.createNewStep(step, selectedScenario.background.stepDefinitions);
    }
    else {
      newStep = this.createNewStep(step, selectedScenario.stepDefinitions);
    }
    if (newStep['type'] === this.newStepName) {
      this.newStepRequest.openNewStepRequestModal(newStep['stepType']);
    } else {
      switch (newStep.stepType) {
        case 'given':
          selectedScenario.stepDefinitions.given.push(newStep);
          lastEl = selectedScenario.stepDefinitions.given.length - 1;
          this.lastToFocus = templateName + '_' + step_idx + '_input_pre_' + lastEl;
          break;
        case 'when':
          switch (templateName) {
            case 'scenario':
              selectedScenario.stepDefinitions.when.push(newStep);
              lastEl = selectedScenario.stepDefinitions.when.length - 1;
              this.lastToFocus = templateName + '_' + step_idx + '_input_pre_' + lastEl;
              break;

            case 'background':
              selectedScenario.background.stepDefinitions.when.push(newStep);
              lastEl = selectedScenario.background.stepDefinitions.when.length - 1;
              this.lastToFocus = templateName + '_step_input_pre_' + lastEl;
              break;
          }
          break;

        case 'then':
          selectedScenario.stepDefinitions.then.push(newStep);
          lastEl = selectedScenario.stepDefinitions.then.length - 1;
          this.lastToFocus = templateName + '_' + step_idx + '_input_pre_' + lastEl;
          break;
        case 'example':
          this.addExampleStep(step);
          break;
        default:
          break;
      }
      this.markUnsaved();
    }
  }

  /**
 * Adds a step to the Block
 * @param step
 * @param position
 */
  addStepToBlock(step, position?: number) {
    const newStep = this.createNewStep(step, this.selectedBlock.stepDefinitions);
    console.log('New created step');
    console.log(newStep);
    switch (newStep.stepType) {
      case 'given':
        if (position) {
          this.selectedBlock.stepDefinitions.given.splice(position, 0, newStep);
        } else {
          this.selectedBlock.stepDefinitions.given.push(newStep);
        }
        break;
      case 'when':
        if (position) {
          this.selectedBlock.stepDefinitions.when.splice(position, 0, newStep);
        } else {
          this.selectedBlock.stepDefinitions.when.push(newStep);
        }
        break;
      case 'then':
        if (position) {
          this.selectedBlock.stepDefinitions.then.splice(position, 0, newStep);
        } else {
          this.selectedBlock.stepDefinitions.then.push(newStep);
        }
        break;
    }
    console.log('Current block');
    console.log(this.selectedBlock);

  }

  openNewExample(step) {
    this.newExampleModal.openNewExampleModal(this.selectedScenario, step);
  }

  /**
  * Creates a new step
  * @param step
  * @param stepDefinitions
  * @returns
  */
  createNewStep(step: StepType, stepDefinitions: StepDefinition | StepDefinitionBackground, stepType?: string): StepType {
    const obj = JSON.parse(JSON.stringify(step));
    const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
    const newStep: StepType = {
      id: newId,
      mid: obj.mid,
      pre: obj.pre,
      post: obj.post,
      stepType: stepType === 'example' ? stepType : obj.stepType,
      type: obj.type,
      values: stepType === 'example' ? ['value'] : obj.values,
      isExample: stepType === 'example' ? [true] : [false]
    };
    return newStep;
  }


  /**
  * Gets the last id in the steps
  * @param stepDefs
  * @param stepStepType
  * @returns
  */

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

  /**
  * gets the id of the step
  * @param step
  * @returns
  */
  buildID(step): number {
    if (step.length !== 0) {
      return step[step.length - 1].id;
    } else {
      return 0;
    }
  }

  getKeysList(stepDefs: StepDefinition) {
    if (stepDefs != null) {
      return Object.keys(stepDefs);
    } else {
      return '';
    }
  }

  /**
  * Sort the step types 
  * @returns 
  */
  sortedStepTypes() {
    if (this.originalStepTypes) {
      const sortedStepTypes = this.originalStepTypes;
      sortedStepTypes.sort((a, b) => {
        return a.id - b.id;
      });
      return sortedStepTypes;
    }
  }

  getUniqueSteps(): StepType[] {
    let uniqueStepTypes: StepType[] = [];
    let addedTypes: Set<string> = new Set();
    let screenshotCount = 0;

    for (let step of this.sortedStepTypes()) {
      if (step.type === 'Screenshot') { //first two screenshot elements do not work (?) we skip these and take third screenshot element
        screenshotCount++;
        if (screenshotCount > 3 && !addedTypes.has(step.type)) {
          uniqueStepTypes.push(step);
          addedTypes.add(step.type);
        }
      } else if (!addedTypes.has(step.type)) {
        uniqueStepTypes.push(step);
        addedTypes.add(step.type);
      }
    }

    return uniqueStepTypes;
  }

  /**
   * Gets the steps list (For Background: it should be set to 1 in order to enter when-Block)
   * @param stepDefs 
   * @param i number of steptype
   * @returns 
   */
  getStepsList(stepDefs: StepDefinition, i: number) {
    switch (i) {
      case 0:
        return stepDefs.given;
      case 1:
        return stepDefs.when;
      case 2:
        return stepDefs.then;
    }
    return stepDefs.example;
  }

  /**
  * Gets the steps list (For BlockPreview)
  * @param stepDefs 
  * @returns 
  */
  getStepsListBlockPreview(stepDefs: StepDefinition) {
    const { given = [], when = [], then = [] } = stepDefs || {};
    const allStepValues = [...given, ...when, ...then];
    return allStepValues;

  }


  /**
    * Drag and drop event for a step 
    * @param event
    * @param stepDefs
    * @param stepIndex
    */

  onDrop(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
    if (this.selectedCount(stepDefs, stepIndex) > 1) {
      let indices = event.item.data.indices;
      let change = event.currentIndex - event.previousIndex;

      let newList = []

      if (change > 0) {
        let startOfList = this.getStepsList(stepDefs, stepIndex).slice(0, event.currentIndex + 1)
        let middleOfList: StepType[] = []
        let endOfList = this.getStepsList(stepDefs, stepIndex).slice(event.currentIndex + 1)
        indices.forEach((element) => {
          middleOfList.push(element.value)
        });
        let startOfListFiltered = startOfList.filter((el) => !middleOfList.includes(el));
        let endOfListFiltered = endOfList.filter((el) => !middleOfList.includes(el));
        startOfListFiltered.push(...middleOfList)
        startOfListFiltered.push(...endOfListFiltered)
        newList = startOfListFiltered
      } else if (change < 0) {
        let startOfList = this.getStepsList(stepDefs, stepIndex).slice(0, event.currentIndex)
        let middleOfList: StepType[] = []
        let endOfList = this.getStepsList(stepDefs, stepIndex).slice(event.currentIndex)
        indices.forEach((element) => {
          middleOfList.push(element.value)
        });
        let startOfListFiltered = startOfList.filter((el) => !middleOfList.includes(el));
        let endOfListFiltered = endOfList.filter((el) => !middleOfList.includes(el));
        startOfListFiltered.push(...middleOfList)
        startOfListFiltered.push(...endOfListFiltered)
        newList = startOfListFiltered
      }
      else {
        newList = this.getStepsList(stepDefs, stepIndex)
      }
      this.updateList(stepIndex, newList);

    } else {
      moveItemInArray(this.getStepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
    }
    this.markUnsaved();
  }

  onDropBlock(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
    moveItemInArray(this.getStepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
    this.saved = false;
  }

  /**
   * Marks story or scenario unsaved depending on template
   */
  markUnsaved() {
    switch (this.templateName) {
      case 'background':
        this.selectedStory.background.saved = false;
        this.backgroundService.backgroundReplaced = undefined;
        break;
      case 'scenario':
        this.selectedScenario.saved = false;
        break;
      case 'example':
        this.selectedScenario.saved = false;
        break;
      case 'block-editor':
        this.selectedScenario.saved = false;
        break;
    }
  }

  /** Updates step definitions list (background & scenario)
   * @param stepIndex 
   * @param newList List afret dragging
   *  */

  updateList(stepIndex: number, newList) {
    switch (this.templateName) {
      case 'background':
        this.selectedStory.background.stepDefinitions.when = newList
        break;
      case 'scenario':
        if (stepIndex === 0) {
          this.selectedScenario.stepDefinitions.given = newList
        } else if (stepIndex === 1) {
          this.selectedScenario.stepDefinitions.when = newList
        } else if (stepIndex === 2) {
          this.selectedScenario.stepDefinitions.then = newList
        }
        break;
    }
  }

  /**
    * Maps all selected steps to their index
    * Sets dragging boolean
    * @param event
    * @param i 
    */

  dragStarted(event: CdkDragStart, stepDefs, i: number): void {
    this.dragging = event.source._dragRef;
    let indices = null;
    switch (this.templateName) {
      case 'background':
        /* indices = stepDefs.when
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { 
            return element.value.checked}); */
        indices = this.getCheckedValues(stepDefs, i);
        break;
      case 'scenario':
        indices = this.getCheckedValues(stepDefs, i);
        /* if (i === 0) {
          indices = stepDefs.given
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { return element.value.checked});
        } else if (i === 1) {
          indices = stepDefs.when
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { return element.value.checked});
        } else if (i === 2) {
          indices = stepDefs.then
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { return element.value.checked});
        } */
        break;
    }
    event.source.data = {
      indices,
      values: indices.map(a => a.index),
      source: this,
    };
  }

  /**
   * Iterates through steps and returns the "checked" values
   * @param indices Dragging indices
   * @param stepDefs Stepdefinitions (background or scenario)
   * @param i Step index (For background: currently set to 1 in order to enter when-block)
   * @return Checked values of steps
   */
  getCheckedValues(stepDefs, i) {
    if (i === 0) {
      return stepDefs.given
        .map(function (element, index) { return { index: index, value: element } })
        .filter(function (element) { return element.value.checked });
    } else if (i === 1) {
      return stepDefs.when
        .map(function (element, index) { return { index: index, value: element } })
        .filter(function (element) { return element.value.checked });
    } else if (i === 2) {
      return stepDefs.then
        .map(function (element, index) { return { index: index, value: element } })
        .filter(function (element) { return element.value.checked });
    }

  }



  /**
    * Sets dragging boolean
    */
  dragEnded(): void {
    this.dragging = null;
  }

  /**
    * Checks if step is selected
    * @param i 
    * @param j 
    * @returns 
    */

  isSelected(stepDefs, i: number, j: number): any {
    switch (this.templateName) {
      case 'background':
        //return stepDefs.when[j].checked;
        return this.returnCheckedValue(stepDefs, i, j);

      case 'scenario':
        /* if (i === 0) {
          return stepDefs.given[j].checked;
        } else if (i === 1) {
            return stepDefs.when[j].checked;
        } else if (i === 2) {
            return stepDefs.then[j].checked;
        }
        return false; */
        return this.returnCheckedValue(stepDefs, i, j);
    }

  }

  /**
   * Returns values of "checked" property
   * @param stepDefs 
   * @param i Step index (Background: must set to 1 in order to enter when-block)
   * @param j 
   * @returns 
   */
  returnCheckedValue(stepDefs, i: number, j: number) {
    if (i === 0) {
      return stepDefs.given[j].checked;
    } else if (i === 1) {
      return stepDefs.when[j].checked;
    } else if (i === 2) {
      return stepDefs.then[j].checked;
    }
    return false;
  }

  /**
    * Returns count of all selected step from one stepDefinition
    * @param stepDefs
    * @param i 
    * @returns 
    */

  selectedCount(stepDefs, i: number) {
    let result
    switch (this.templateName) {
      case 'background':
        //this.selectedStory.background.stepDefinitions.when.forEach(element => { if(element.checked){counter++;} });
        result = this.countChecked(stepDefs, i);
        break;
      case 'scenario':
        /* if (i === 0) {
          this.selectedScenario.stepDefinitions.given.forEach(element => { if(element.checked){counter++;} });
        } else if (i === 1) {
          this.selectedScenario.stepDefinitions.when.forEach(element => { if(element.checked){counter++;} });
        } else if (i === 2) {
          this.selectedScenario.stepDefinitions.then.forEach(element => { if(element.checked){counter++;} });
        } */
        result = this.countChecked(stepDefs, i);
        break;
    }
    return result
  }

  countChecked(stepDefs, i) {
    let counter = 0
    if (i === 0) {
      stepDefs.given.forEach(element => { if (element.checked) { counter++; } });
    } else if (i === 1) {
      stepDefs.when.forEach(element => { if (element.checked) { counter++; } });
    } else if (i === 2) {
      stepDefs.then.forEach(element => { if (element.checked) { counter++; } });
    }
    return counter
  }

  /**
    * Check all steps
    * @param checkValue
    */
  checkAllSteps(checkValue?: boolean) {
    if (checkValue != undefined) {
      this.allChecked = checkValue;
    } else {
      this.allChecked = !this.allChecked;
    }
    delete this.isReferenceBlock;
    switch (this.templateName) {
      case 'background':
        this.checkOnIteration(this.selectedStory.background.stepDefinitions, this.allChecked);
        break;

      case 'scenario':
        this.checkOnIteration(this.selectedScenario.stepDefinitions, this.allChecked);
        break;

      case 'example':
        this.checkOnIteration(this.selectedScenario.stepDefinitions.example, this.allChecked);
        break;

      case 'block-editor':
        if (this.allChecked) {
          for (const prop in this.selectedBlock.stepDefinitions) {
            for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
              this.checkStep(this.selectedBlock.stepDefinitions[prop][i], true);
            }
          }
          this.activeActionBar = true;
          this.allChecked = true;
        } else {
          for (const prop in this.selectedBlock.stepDefinitions) {
            for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
              this.checkStep(this.selectedBlock.stepDefinitions[prop][i], false);
            }
          }
          this.activeActionBar = false;
          this.allChecked = false;
        }
        break;
    }
  }


  checkOnIteration(stepsList, checkValue: boolean) {
    //background & scenario
    for (const prop in stepsList) {
      if (this.templateName !== 'example' && prop !== 'example') {
        for (let i = stepsList[prop].length - 1; i >= 0; i--) {
          this.checkStep(stepsList[prop][i], checkValue);
        }
      } else {
        // example
        for (let i = stepsList.length - 1; i > 0; i--) {
          this.checkStep(stepsList[i], checkValue);
        }
      }

    }
  }

  /**
    *  Handles checkboxes on click
    * @param event Click event
    * @param step Current step
    * @param checkbox_id Checkbox id
    * @param checkValue Optional value
    */
  handleClick(event, step, checkbox_id, checkValue?: boolean) {
    // if key pressed is shift
    delete this.isReferenceBlock;
    if (event.shiftKey && this.lastVisitedTemplate == this.templateName) {
      this.checkMany(step, checkbox_id);
    } else {
      this.checkStep(step);
    }
    // Set current step to last checked
    this.lastCheckedCheckboxIDx = checkbox_id;
    this.lastVisitedTemplate = this.templateName;
  }

  /**
    * Checks many steps on shift click
    * @param currentStep
    * @param checkbox_id
    */

  checkMany(currentStep, checkbox_id) {
    let newTmp: number = checkbox_id;  // current step id
    let lastTmp = this.lastCheckedCheckboxIDx;
    // Find in this block start and end step

    let start = Math.min(newTmp, lastTmp); // get starting & ending array element
    let end = Math.max(newTmp, lastTmp);


    // Check all steps in the list between start and end
    switch (this.templateName) {
      case 'scenario':
        const scenario_val = this.selectedScenario.stepDefinitions[currentStep.stepType][lastTmp].checked;
        for (let i = start + 1; i <= end; i++) {
          this.selectedScenario.stepDefinitions[currentStep.stepType][i].checked = scenario_val;
        }
        break;
      case 'background':
        const background_val = this.selectedStory.background.stepDefinitions[currentStep.stepType][lastTmp].checked;
        for (let i = start + 1; i <= end; i++) {
          this.selectedStory.background.stepDefinitions[currentStep.stepType][i].checked = background_val;
        }
        break;
      case 'example':
        break;
    }
    setTimeout(() => {
      this.areAllStepsChecked();
    }, 20);


  }


  /**
   * Checks a step
   * @param step
   * @param checkValue Optional value
   */

  checkStep(step, checkValue?: boolean) {
    switch (this.templateName) {
      case 'block-editor':
        if (checkValue != null) {
          step.checked = checkValue;
        } else {
          step.checked = !step.checked;
        }
        let checkCount = 0;
        let stepCount = 0;

        for (const prop in this.selectedBlock.stepDefinitions) {
          for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
            stepCount++;
            if (this.selectedBlock.stepDefinitions[prop][i].checked) {
              checkCount++;
            }
          }
        }
        if (checkCount >= stepCount) {
          this.allChecked = true;
        } else {
          this.allChecked = false;
        }
        if (checkCount <= 0) {
          this.allChecked = false;
          this.activeActionBar = false;
        } else {
          this.activeActionBar = true;
        }
        break;
      default:
        if (checkValue !== undefined) {
          step.checked = checkValue;
        } else {
          step.checked = !step.checked;
          this.disableSaveBlock(step);
        }
        this.areAllStepsChecked();
        break;
    }
  }

  /**
   * Enables/disables "Save steps as Block" if only reference-block-steps selected
   */
  disableSaveBlock(step) {
    let allSelectedSteps = 0;
    let onlyReferenceSteps = 0;
    if (this.templateName === 'scenario') {
      for (const prop in this.selectedScenario.stepDefinitions) {
        if (prop !== 'example') {
          for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
            if (this.selectedScenario.stepDefinitions[prop][i].checked) {
              allSelectedSteps++;
            } if (this.selectedScenario.stepDefinitions[prop][i].checked && this.selectedScenario.stepDefinitions[prop][i]._blockReferenceId) {
              onlyReferenceSteps++;
            }
          }
        }
      }
      if (onlyReferenceSteps == allSelectedSteps) {
        this.isReferenceBlock = true;
      }
    }
  }
  /**
   * Enables/disables action bar and checkbox in it depending on whether all steps are checked 
   */
  areAllStepsChecked() {

    let checkCount = 0;
    let stepCount = 0;

    switch (this.templateName) {

      case 'scenario':
        for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
            for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
              stepCount++;
              if (this.selectedScenario.stepDefinitions[prop][i].checked) {
                checkCount++;
              }
            }
          }
        }
        this.updateAllActionBar(checkCount, stepCount);
        break;

      case 'background':
        for (const prop in this.selectedStory.background.stepDefinitions) {
          for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
            stepCount++;
            if (this.selectedStory.background.stepDefinitions[prop][i].checked) {
              checkCount++;
            }
          }
        }
        this.updateAllActionBar(checkCount, stepCount);
        break;

      case 'example':
        for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i > 0; i--) {
          stepCount++;
          if (this.selectedScenario.stepDefinitions.example[i].checked) {
            checkCount++;
          }
        }
        this.updateAllActionBar(checkCount, stepCount);
        break;
      default:
        break;
    }
  }

  /**
   * De-/activates buttons & checkbox in action bar
   * @param checkCount 
   * @param stepCount 
   */
  updateAllActionBar(checkCount, stepCount) {
    this.allChecked = checkCount >= stepCount;
    if (checkCount <= 0) {
      this.allChecked = false;
      this.activeActionBar = false;
    } else {
      this.activeActionBar = true;
    }
  }


  /** Action bar methods */

  /**
    * Save a new block
    * 
    */

  saveBlock(): void {

    //const saveBlock = {given: [], when: [], then: [], example: []};
    let saveBlock;

    switch (this.templateName) {
      case 'background':
        saveBlock = this.addStepsToBlockOnIteration(JSON.parse(JSON.stringify(this.selectedStory.background.stepDefinitions)));
        /* for (const prop in this.selectedStory.background.stepDefinitions) {
            for (const s in this.selectedStory.background.stepDefinitions[prop]) {
              if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                saveBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
              }
            }
        } */
        break;

      case 'scenario':
        saveBlock = this.addStepsToBlockOnIteration(JSON.parse(JSON.stringify(this.selectedScenario.stepDefinitions)));
        /* for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                  if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                    saveBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
                  }
                }
            }
        } */
        break;
      default:
        break;
    }

    const block: Block = { name: 'TEST', stepDefinitions: saveBlock };
    this.saveBlockModal.openSaveBlockFormModal(block, this);

  }

  /**
    * Return examples to steps
    * 
    */
  reactivateExampleSteps() {
    this.selectedScenario.stepDefinitions.example.forEach((value, index) => {
      value.values.forEach((val, i) => {
        {
          this.selectedScenario.stepDefinitions.example[index].isExample[i] = true
        }
      })
    })
  }

  /**
    * Delete rows or deactivate examples
    * 
    */
  deleteRows() {
    this.selectedScenario.stepDefinitions.given.forEach((value, index) => {
      value.values.forEach((val, i) => {
        {
          this.selectedScenario.stepDefinitions.given[index].isExample[i] = undefined
        }
      })
    })
    this.selectedScenario.stepDefinitions.when.forEach((value, index) => {
      value.values.forEach((val, i) => {
        {
          this.selectedScenario.stepDefinitions.when[index].isExample[i] = undefined
        }
      })
    })
    this.selectedScenario.stepDefinitions.then.forEach((value, index) => {
      value.values.forEach((val, i) => {
        {
          this.selectedScenario.stepDefinitions.then[index].isExample[i] = undefined
        }
      })
    })
  }
  /**
    * Deactivates all example steps
    * 
    */
  deactivateAllExampleSteps() {
    this.activatedSteps = 0;
    this.allDeactivated = true;
    this.selectedScenario.stepDefinitions.example.forEach((value, index) => {
      value.values.forEach((val, i) => {
        {
          this.selectedScenario.stepDefinitions.example[index].isExample[i] = false
        }
      })
    })
  }
  /**
   * Deactivates all checked step
   * 
   */

  deactivateStep(): void {
    switch (this.templateName) {
      case 'background':
        this.deactivateOnIteration(this.selectedStory.background.stepDefinitions);
        /* for (const prop in this.selectedStory.background.stepDefinitions) {
          for (const s in this.selectedStory.background.stepDefinitions[prop]) {
              if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                this.selectedStory.background.stepDefinitions[prop][s].deactivated = !this.selectedStory.background.stepDefinitions[prop][s].deactivated;
              }
          }
        } */
        //this.selectedStory.background.saved = false;
        this.markUnsaved();
        break;

      case 'scenario':
        this.deactivateOnIteration(this.selectedScenario.stepDefinitions);
        /* for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
              for (const s in this.selectedScenario.stepDefinitions[prop]) {
                  if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                      this.selectedScenario.stepDefinitions[prop][s].deactivated = !this.selectedScenario.stepDefinitions[prop][s].deactivated;
                  }
              }
          }
        } */
        //this.selectedScenario.saved = false;
        this.markUnsaved();
        break;
      case 'example':
        {
          this.allDeactivated = false;
          if (!this.allDeactivated) {
            this.reactivateExampleSteps();
          }
          let example = this.selectedScenario.stepDefinitions.example;
          const totalSteps = Object.keys(example).length;
          example.forEach(step => {
            if (step.checked && this.activatedSteps < totalSteps - 1) {
              step.deactivated = !step.deactivated;
              if (step.deactivated)
                this.activatedSteps++;
            }
          });
          if (this.activatedSteps === totalSteps - 1) {
            this.deactivateAllExampleSteps();
            this.markUnsaved();
            return
          }
        }
        //this.selectedScenario.saved = false;
        this.markUnsaved();
        break;

      case 'block-editor':
        this.deactivateOnIteration(this.selectedScenario.stepDefinitions);
        this.markUnsaved();
        // for (const prop in this.selectedBlock.stepDefinitions) {
        //   for (const s in this.selectedBlock.stepDefinitions[prop]) {
        //     if (this.selectedBlock.stepDefinitions[prop][s].checked) {
        //       this.selectedBlock.stepDefinitions[prop][s].deactivated = !this.selectedBlock.stepDefinitions[prop][s].deactivated;
        //     }
        //   }
        // }
        break;
      default:
        break;
    }
  }

  deactivateOnIteration(stepsList) {
    //background & scenario
    for (const prop in stepsList) {
      if (prop !== 'example') {
        for (const s in stepsList[prop]) {
          if (stepsList[prop][s].checked) {
            stepsList[prop][s].deactivated = !stepsList[prop][s].deactivated;
          }
        }
      }
    }
  }

  /**
    * Removes a step
    * 
    */

  removeStep() {
    switch (this.templateName) {
      case 'background':
        this.removeStepOnIteration(this.selectedStory.background.stepDefinitions);
        /* for (const prop in this.selectedStory.background.stepDefinitions) {
          for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
            if (this.selectedStory.background.stepDefinitions[prop][i].checked) {
              this.selectedStory.background.stepDefinitions[prop].splice(i, 1);
            }
          }
        } */
        //this.selectedStory.background.saved = false;
        this.markUnsaved();
        break;
      case 'scenario':
        this.removeStepOnIteration(this.selectedScenario.stepDefinitions);
        /* for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
            for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
              if (this.selectedScenario.stepDefinitions[prop][i].checked) {
                this.selectedScenario.stepDefinitions[prop].splice(i, 1);
              }
            }
          }
        } */
        //this.selectedScenario.saved = false;
        this.markUnsaved();
        break;
      case 'example':
        for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i > 0; i--) {
          if (this.selectedScenario.stepDefinitions.example[i].checked) {
            if (i - 1 == 0 && this.selectedScenario.stepDefinitions.example.length - 2 == 0) {
              this.deleteRows();
              this.selectedScenario.stepDefinitions.example = []
              this.markUnsaved();
              return
            }
            this.selectedScenario.stepDefinitions.example.splice(i, 1);
          }
        }
        this.exampleService.updateExampleTableEmit();
        this.markUnsaved();
        break;

      case 'block-editor':
        for (const prop in this.selectedBlock.stepDefinitions) {
          for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
            if (this.selectedBlock.stepDefinitions[prop][i].checked) {
              this.selectedBlock.stepDefinitions[prop].splice(i, 1);
            }
          }
        }
        this.saved = false;
        this.allChecked = false;
        this.activeActionBar = false;
        break;
      default:
        break;
    }
    this.checkAllSteps(false);
  }

  /**
   * Removes step on iteration
   * @param stepsList Step definitions or examples
   */
  removeStepOnIteration(stepsList) {
    //background & scenario
    for (const prop in stepsList) {
      if (this.templateName !== 'example' && prop !== 'example') {
        for (let i = stepsList[prop].length - 1; i >= 0; i--) {
          if (stepsList[prop][i].checked) {
            if(stepsList[prop][i]._blockReferenceId){
              this.blockService.checkRefOnRemoveEmitter(stepsList[prop][i]._blockReferenceId);
            }
            stepsList[prop].splice(i, 1);
          }
        }
      }
    }
    if (this.allChecked) {
      this.activeActionBar = !this.activeActionBar;
    }
  }

  /**
    * Copy a block
    * 
    */

  copyBlock(): void {

    //const copyBlock = {given: [], when: [], then: [], example: []};
    let block;
    let backgroundBlock: Block;
    switch (this.templateName) {
      case 'background':
        block = this.addStepsToBlockOnIteration(this.selectedStory.background.stepDefinitions);
        /* for (const prop in this.selectedStory.background.stepDefinitions) {
          for (const s in this.selectedStory.background.stepDefinitions[prop]) {
            if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
              this.selectedStory.background.stepDefinitions[prop][s].checked = false;
              copyBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
            }
          }
        }*/
        backgroundBlock = { stepDefinitions: block };
        sessionStorage.setItem('scenarioBlock', JSON.stringify(backgroundBlock));
        this.toastr.success('successfully copied', 'Step(s)');
        break;

      case 'scenario':
        block = this.addStepsToBlockOnIteration(this.selectedScenario.stepDefinitions);
        /* for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
            for (const s in this.selectedScenario.stepDefinitions[prop]) {
              if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                this.selectedScenario.stepDefinitions[prop][s].checked = false;
                copyBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
              }
            }
          }
        }*/
        const scenarioBlock: Block = { stepDefinitions: block };
        sessionStorage.setItem('scenarioBlock', JSON.stringify(scenarioBlock));
        this.toastr.success('successfully copied', 'Step(s)');
        break;

      case 'example':
        block = [];
        for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i > 0; i--) {
          if (this.selectedScenario.stepDefinitions.example[i].checked) {
            block.push(this.selectedScenario.stepDefinitions.example[i])
          }
        }
        const exampleBlock: Block = { stepDefinitions: { given: [], when: [], then: [], example: block } };
        sessionStorage.setItem('copiedExampleBlock', JSON.stringify(exampleBlock));
        this.toastr.success('successfully copied', 'Examples');
        break;

      case 'block-editor':
        const copyBlock: any = { given: [], when: [], then: [], example: [] };
        for (const prop in this.selectedBlock.stepDefinitions) {
          if (prop !== 'example') {
            for (const s in this.selectedBlock.stepDefinitions[prop]) {
              if (this.selectedBlock.stepDefinitions[prop][s].checked) {
                this.selectedBlock.stepDefinitions[prop][s].checked = false;
                copyBlock[prop].push(this.selectedBlock.stepDefinitions[prop][s]);
              }
            }
          }
        }
        block = { stepDefinitions: copyBlock };
        sessionStorage.setItem('copiedBlock', JSON.stringify(block));
        this.allChecked = false;
        this.activeActionBar = false;
      default:
        break;
    }
    this.checkAllSteps(false);
  }

  /**
   * Iterates through @param stepsList and adds it to a block
   * @param stepsList Step Definitions or examples
   * @returns 
   */
  addStepsToBlockOnIteration(stepList) {
    let stepsList = JSON.parse(JSON.stringify(stepList))
    const copyBlock = { given: [], when: [], then: [], example: [] };
    const stepsListIterate = { given: [], when: [], then: [] };
    let examplesToBeCopied = []
    Object.keys(stepsListIterate).forEach((key, _) => {
      for (const s in stepsList[key]) {
        if (stepsList[key][s].checked) {
          copyBlock[key].push(stepsList[key][s]);
          stepsList[key][s].values.forEach((value, index) => {
            if (stepsList[key][s].isExample[index]) {
              examplesToBeCopied.push(value.slice(1, -1))
            }
          });
        }
      }
    });
    if (examplesToBeCopied.length > 0) {
      let indexList = []
      stepsList['example'][0].values.forEach((value, index) => {
        if (examplesToBeCopied.includes(value)) {
          indexList.push(index)
        }
      });
      stepsList['example'].forEach(element => {
        const filteredExamples = element.values.filter((val, index) => indexList.includes(index))
        element.values = filteredExamples
        copyBlock['example'].push(element)
      });
    }

    return copyBlock
  }
  /**
    * Insert block from clipboard
    * 
    */
  insertCopiedBlock(): void {
    switch (this.templateName) {
      case 'background':
        Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, _) => {
          if (key === 'when') {
            this.clipboardBlock.stepDefinitions[key].forEach((step: StepType) => {
              this.selectedStory.background.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
            });
          }
        });
        //this.selectedStory.background.saved = false;
        this.markUnsaved();
        break;

      case 'scenario':
        //this.insertStepsWithExamples()
        if (this.clipboardBlock.stepDefinitions['example'].length != 0) {
          this.apiService.nameOfComponent('copyExampleToast');
          this.apiService.setToastrOptions('Copy with multiple scenario(s)', 'Copy without multiple scenario(s)');
          this.toastr.info('Do you want to copy it?', 'Block contains muliple scenario(s)', {
            toastComponent: InfoWarningToast
          });

        } else {
          Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, _) => {
            if (key != 'example') {
              this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
                this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
              });
            }
          });
          this.markUnsaved();
        }
        break;

      case 'example':
        Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, _) => {
          this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
            if (key == 'example') {
              this.fillExapleValues(key, j, step);
            }
          });
        });
        this.exampleService.updateExampleTableEmit();
        this.markUnsaved();
        break;

      default:
        break;
    }
  }

  /**
   * Changes the name of the example in the clipboard
   * @param indices indices of names to change
   * @param num number to append to the name
   */
  changeExampleName(block, indices, num) {
    indices.forEach(index => {
      let oldName = block.stepDefinitions['example'][0].values[index]
      let newName
      if (num > 1) {
        newName = oldName.split(' - ')[0] + ' - ' + num
      } else {
        newName = oldName + ' - ' + num
      }
      block.stepDefinitions['example'][0].values[index] = newName
      Object.keys(block.stepDefinitions).forEach((key, _) => {
        if (key != 'example') {
          block.stepDefinitions[key].forEach((step: StepType, i) => {
            step.values.forEach((value, j) => {
              if (value === '<' + oldName + '>') {
                block.stepDefinitions[key][i].values[j] = '<' + newName + '>'
              }
            });
          });
        }
      });
    });
  }

  /**
   * Inserts copied steps with examples
   * Checks for unique example names
   */
  insertStepsWithExamples(block) {
    if (this.selectedScenario.stepDefinitions['example'].length != 0) {
      let indices = this.selectedScenario.stepDefinitions['example'][0].values.map(x => block.stepDefinitions['example'][0].values.indexOf(x)).filter(x => x != -1);
      let num = 1;
      while (indices.length > 0) {
        this.changeExampleName(block, indices, num);
        num++;
        indices = this.selectedScenario.stepDefinitions['example'][0].values.map(x => block.stepDefinitions['example'][0].values.indexOf(x)).filter(x => x != -1)
      }
    }
    Object.keys(block.stepDefinitions).forEach((key, _) => {
      if (key != 'example') {
        block.stepDefinitions[key].forEach((step: StepType, j) => {
          this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
        });
      } else if (key == 'example') {
        this.insertCopiedExamples(block)
      }
    });
    this.markUnsaved();

  }

  /**
   * Inserts copied steps without example
   * Removes examplenames from steps values
   */
  insertStepsWithoutExamples() {
    Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, _) => {
      if (key != 'example') {
        this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
          let stepCopy = JSON.parse(JSON.stringify(step))
          step.isExample.forEach((isExample, index) => {
            if (isExample) {
              stepCopy.isExample[index] = false
              stepCopy.values[index] = ""
            }
          })
          this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(stepCopy)));
        });
      }
    });
    this.markUnsaved();
  }

  /**
   * checks if example name of clipboard already in selected scenario and if sets toaster
   * checks for number of values and adds 'value' in case of different lengths of clipboard and selected scenario
   * checks for example names and adds ' - Copy' in case of double names
   */
  insertCopiedExamples(block) {
    const selectedExampleDefs = this.selectedScenario.stepDefinitions['example'];
    const blockExampleDefs = block.stepDefinitions['example'];

    if (selectedExampleDefs.length === 0) {
      this.selectedScenario.stepDefinitions['example'] = blockExampleDefs;
      return;
    }

    if (selectedExampleDefs.length === blockExampleDefs.length) {
      this.insertValuesIntoSelectedExamples(selectedExampleDefs, blockExampleDefs);
    } else if (selectedExampleDefs.length < blockExampleDefs.length) {
      this.insertValuesIntoSelectedExamples(selectedExampleDefs, blockExampleDefs, true);
      this.insertNewExamples(selectedExampleDefs, blockExampleDefs);
    } else {
      this.insertValuesIntoSelectedExamples(selectedExampleDefs, blockExampleDefs);
      this.insertPlaceholderValues(selectedExampleDefs, selectedExampleDefs[0].values.length);
    }
    this.exampleService.updateExampleTableEmit();
    this.markUnsaved()
  }

  insertValuesIntoSelectedExamples(selectedExampleDefs, blockExampleDefs, useSelectedLength = false) {
    const length = useSelectedLength ? selectedExampleDefs.length : blockExampleDefs.length;
    for (let i = 0; i < length; i++) {
      blockExampleDefs[i].values.forEach(val => {
        selectedExampleDefs[i].values.push(val);
      });
    }
  }

  insertNewExamples(selectedExampleDefs, blockExampleDefs) {
    const selectedLength = selectedExampleDefs.length;
    for (let i = selectedLength; i < blockExampleDefs.length; i++) {
      const clipboardValueLength = blockExampleDefs[i].values.length;
      const selectedValueLength = selectedExampleDefs[i - 1].values.length - clipboardValueLength;
      selectedExampleDefs.push(JSON.parse(JSON.stringify(selectedExampleDefs[i - 1])));
      for (let j = 0; j < selectedValueLength; j++) {
        selectedExampleDefs[i].values[j] = 'value';
      }
      for (let k = 0; k < clipboardValueLength; k++) {
        selectedExampleDefs[i].values[selectedValueLength + k] = blockExampleDefs[i].values[k];
      }
    }
  }

  insertPlaceholderValues(selectedExampleDefs, length) {
    selectedExampleDefs.forEach(element => {
      for (let i = element.values.length; i < length; i++) {
        element.values.push('value');
      }
    });
  }



  /**
    * Opens add block modal
    * 
    */

  addBlock() {
    const id = localStorage.getItem('id');
    this.addBlockModal.openAddBlockFormModal(this.templateName, id);
  }

  /**
   * Block methods 
   */

  editBlock() {
    this.editBlockModal.openEditBlockModal();
    const x = document.getElementsByClassName('stepBlockContainer')[0];
    x.setAttribute('aria-expanded', 'false');
  }

  /**
   * Methods for referenced Blocks (only implemented for scenarios)
   */


  /**
   * Select Block by blockId to get Block Object
   * @param blockId: _id of the Block
   */
  selectBlock(block) {
    this.blockSelectTriggerEvent.emit(block);
    this.expandStepBlock = true;
  }

  /**
   * Unselect Block and reset selected Block
   */
  unselectBlock() {
    this.expandStepBlock = false;
  }

  showUnpackBlockToast(block) {
    this.apiService.nameOfComponent('unpackBlock');
    this.blockService.block = block;
    this.toastr.warning(
    'Unpacking the Block will remove its reference to the original Block! Do you want to unpack the block?', 'Unpack Block', {
      toastComponent: DeleteToast
    });
  }


  /* Example case methods */


  /**
     * List all examples from scenario
     * @returns returns all examples in list
     */
  getExampleList() {
    if (this.selectedScenario.stepDefinitions.example && this.selectedScenario.stepDefinitions.example.length && this.selectedScenario.stepDefinitions.example[0].values.length) {
      return this.selectedScenario.stepDefinitions.example[0].values
    }
    return undefined
  }

  /**
    * Checks the input if an example should be generated or removed
    * @param input
    * @param stepType
    * @param step
    * @param stepIndex
    * @param valueIndex
    */
  addIsExample(input, stepIndex: number, valueIndex: number, stepType: string) {
    switch (stepType) {
      case 'given':
        this.selectedScenario.stepDefinitions.given[stepIndex].isExample[valueIndex] = (input == 'example') ? true : false;
        break;
      case 'when':
        this.selectedScenario.stepDefinitions.when[stepIndex].isExample[valueIndex] = (input == 'example') ? true : false;
        break;
      case 'then':
        this.selectedScenario.stepDefinitions.then[stepIndex].isExample[valueIndex] = (input == 'example') ? true : false;
        break;
    }
  }

  /**
    * Rename an example
    * @param newName 
    * @param index index of example in values array
    */
  renameExample(newName, index) {
    if (this.templateName == 'example') {
      let oldName = this.selectedScenario.stepDefinitions.example[0].values[index]
      this.selectedScenario.stepDefinitions.example[0].values[index] = newName
      this.uncutInputs[this.uncutInputs.indexOf('<' + oldName + '>')] = '<' + newName + '>';

      this.selectedScenario.stepDefinitions.given.forEach((value, index) => {
        value.values.forEach((val, i) => {
          if (val == '<' + oldName + '>') {
            this.selectedScenario.stepDefinitions.given[index].values[i] = '<' + newName + '>'
          }
        })
      })

      this.selectedScenario.stepDefinitions.when.forEach((value, index) => {
        value.values.forEach((val, i) => {
          if (val == '<' + oldName + '>') {
            this.selectedScenario.stepDefinitions.when[index].values[i] = '<' + newName + '>'
          }
        })
      })

      this.selectedScenario.stepDefinitions.then.forEach((value, index) => {
        value.values.forEach((val, i) => {
          if (val == '<' + oldName + '>') {
            this.selectedScenario.stepDefinitions.then[index].values[i] = '<' + newName + '>'
          }
        })
      });
      this.exampleService.updateExampleTableEmit();
      this.markUnsaved();
    }

  }


  /**
    * Handles the update for examples
    * @param input
    * @param step
    * @param valueIndex
    */
  handleExamples(input: string, step: StepType, valueIndex?: number) {
    this.uncutInputs.push(input);
    // for first example creates 2 steps
    if (this.selectedScenario.stepDefinitions.example[0] === undefined) {
      this.createFirstExample(input, step);
    } else {
      // else just adds as many values to the examples to fill up the table
      this.fillExamples(input, step);
    }

  }

  /**
    * Fill all example values after an example step was added
    * @param cutInput
    * @param step
    */
  fillExamples(cutInput: string, step: StepType) {
    if (this.templateName == 'example') {
      this.selectedScenario.stepDefinitions.example[0].values.push(cutInput);
      // if the table has no rows add a row

      if (this.selectedScenario.stepDefinitions.example[1] === undefined) {
        const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
        this.selectedScenario.stepDefinitions.example.push(newStep);
        const len = this.selectedScenario.stepDefinitions.example[0].values.length;
        for (let j = 1; j < len; j++) {
          this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
        }
      } else {
        for (let j = 1; j < this.selectedScenario.stepDefinitions.example.length; j++) {
          this.selectedScenario.stepDefinitions.example[j].values.push('value');
        }
      }
      this.exampleService.updateExampleTableEmit();
    }
  }


  /**
    * Creates the first example of the scenario
    * @param cutInput
    * @param step
    */
  createFirstExample(cutInput: string, step: StepType) {
    for (let i = 0; i <= 2; i++) {
      const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
      this.selectedScenario.stepDefinitions.example.push(newStep);
    }
    this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
    const table = document.getElementsByClassName('mat-mdc-table')[0];
    if (table) { table.classList.add('mat-mdc-elevation-z8'); }

  }

  /**
    * Adds an example step
    * @param step
    */
  addExampleStep(step: StepType) {
    const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
    this.selectedScenario.stepDefinitions.example.push(newStep);
    const len = this.selectedScenario.stepDefinitions.example[0].values.length;
    for (let j = 1; j < len; j++) {
      this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
    }
    this.exampleService.updateExampleTableEmit();
    this.markUnsaved();
  }

  /**
   * Add Value Row
   */
  addExampleValueRow() {
    console.log("selected scenario: ", this.selectedScenario.stepDefinitions)
    let row = JSON.parse(JSON.stringify(this.selectedScenario.stepDefinitions.example[0]))
    row.values.forEach((value, index) => {
      row.values[index] = 'value'
    });
    this.selectedScenario.stepDefinitions.example.push(row)
    this.exampleService.updateExampleTableEmit();
    this.markUnsaved();
  }

  editBlockSubmit() {
    this.blockService.editBlock(this.selectedBlock).subscribe();
    this.modalReference.close();
  }

  onClickSubmit() {
    this.editBlockSubmit();
  }

}
