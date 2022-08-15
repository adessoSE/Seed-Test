import { CdkDragDrop, CdkDragStart, DragRef, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ElementRef, Injectable, Input, OnInit, Output, QueryList, TemplateRef, ViewChild, ViewChildren} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AddBlockFormComponent } from '../modals/add-block-form/add-block-form.component';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { Block } from '../model/Block';
import { Scenario } from '../model/Scenario';
import { StepDefinition } from '../model/StepDefinition';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import { StepType } from '../model/StepType';
import { Story } from '../model/Story';


@Component({
  selector: 'app-editor-parent',
  templateUrl: './editor-parent.component.html',
  styleUrls: ['../story-editor/story-editor.component.css', './editor-parent.component.css']
}) export class EditorParentComponent{

  @ViewChildren('step_type_input') step_type_input: QueryList<ElementRef>;

  @ViewChildren('step_type_input1') step_type_input1: QueryList<ElementRef>;

  @ViewChildren ('checkbox') checkboxes: QueryList<ElementRef>;

  /**
    * View child of the modals component
    */
  @ViewChild('saveBlockModal') saveBlockModal: SaveBlockFormComponent;
  @ViewChild('addBlockModal')addBlockModal: AddBlockFormComponent;

  protected templateName: string; 

  selectedScenario: Scenario;

  selectedStory: Story;

  originalStepTypes: StepType[];

  showDaisy = false;

  /**
  * Name for a new step
  */
  newStepName = 'New Step';

  lastToFocus;

  /**
  * List of all checkboxes
  */
  allCheckboxes;


  /**
  * If the action bar is active
  */
  activeActionBar = false;

  /**
  * If all steps are checked
  */
  allChecked = false;

  lastVisitedTemplate: string ='';
  lastCheckedCheckboxIDx;

  /**
    * Block saved to clipboard
     */
  clipboardBlock: Block = null;

  public dragging: DragRef = null;

  /**
    * If the test is running
    */
  public testRunning = false;

  constructor(public toastr: ToastrService) {}

  ngOnInit() {
    console.log(this.templateName);
  }; 

  /**
    * retrieves the saved block from the session storage
    */
  ngDoCheck(): void {
    switch(this.templateName) {
      case 'background':
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('backgroundBlock'));
        break;

      case 'scenario':
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('scenarioBlock'));
        break;

      default:
        break;
    }
  }

  ngAfterViewInit(): void {
        
    this.step_type_input.changes.subscribe(_ => {
        this.step_type_input.forEach(in_field => {
            
            if ( in_field.nativeElement.id === this.lastToFocus) {
                in_field.nativeElement.focus();
            }
        });
        this.lastToFocus = '';
    }); 
    this.step_type_input1.changes.subscribe(_ => {
      this.step_type_input1.forEach(in_field => {  
        if ( in_field.nativeElement.id === this.lastToFocus) {
          in_field.nativeElement.focus();
        }
      });
      this.lastToFocus = '';
    });
    this.allCheckboxes = this.checkboxes;
    this.checkboxes.changes.subscribe(_ => {
      this.allCheckboxes = this.checkboxes;
    });
  }

  /**
    * Add values to input fields
    * @param input
    * @param stepIndex
    * @param valueIndex
    * @param step
    */
  addToValues(input: string, stepIndex: number, valueIndex: number, step?: StepType): void {}
  
  /**
   * Adds step
   * @param step 
   * @param storyOrScenario 
   * @param step_idx 
   */
  addStep(step: StepType, storyOrScenario:any, step_idx?: any) {
    let lastEl;
    let newStep;
    if (this.templateName == 'background') {
      newStep = this.createNewStep(step, storyOrScenario.background.stepDefinitions);
    } 
    else {
      newStep = this.createNewStep(step, storyOrScenario.stepDefinitions, this.templateName);
    }
    switch (newStep.stepType) {
      case 'given':
          storyOrScenario.stepDefinitions.given.push(newStep);
          lastEl = storyOrScenario.stepDefinitions.given.length-1;
          this.lastToFocus = this.templateName+'_'+step_idx+'_input_pre_'+ lastEl;
          console.log(this.lastToFocus);
          break;
      case 'when':
        switch (this.templateName) {
          case 'scenario':
            storyOrScenario.stepDefinitions.when.push(newStep);
            lastEl = storyOrScenario.stepDefinitions.when.length-1;
            this.lastToFocus = this.templateName+'_'+step_idx+'_input_pre_'+ lastEl;
            console.log(this.lastToFocus);
            break;
            
          case 'background':
            storyOrScenario.background.stepDefinitions.when.push(newStep);
            lastEl = storyOrScenario.background.stepDefinitions.when.length-1;
            this.lastToFocus = this.templateName+'_step_input_pre'+ lastEl;
            storyOrScenario.background.saved = false;
            break;
        }
        break;
    
      case 'then':
        storyOrScenario.stepDefinitions.then.push(newStep);
        lastEl = storyOrScenario.stepDefinitions.then.length-1;
        this.lastToFocus = this.templateName+'_'+step_idx+'_input_pre_'+ lastEl;
        break;
          //TODO
      case 'example':
        //this.addExampleStep(step);
        break;
      default:
        break;
    }
    if (this.templateName === 'scenario') {
      storyOrScenario.saved = false;
    }
    
  }

  /**
  * Creates a new step
  * @param step
  * @param stepDefinitions
  * @returns
  */
  createNewStep(step: StepType, stepDefinitions: StepDefinitionBackground, stepType?: string): StepType {
    const obj = JSON.parse(JSON.stringify(step));
    const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
    const newStep: StepType = {
      id: newId,
      mid: obj.mid,
      pre: obj.pre,
      post: obj.post,
      stepType: stepType === 'example' ? stepType : obj.stepType,
      type: obj.type,
      values: stepType === 'example' ? ['value'] : obj.values
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
      const sortedStepTypes =  this.originalStepTypes;
      sortedStepTypes.sort((a, b) => {
        return a.id - b.id;
      });
      return sortedStepTypes;
    }
  }

  /**
   * Gets the steps list
   * @param stepDefs 
   * @param i 
   * @returns 
   */
  getStepsList(stepDefs: StepDefinition, i?: number) {
    if(this.templateName == 'background') {
      return stepDefs.when;
    }
    else {
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
  }

  //Dragging element methods


  /**
    * Drag and drop event for a step 
    * @param event
    * @param stepDefs
    * @param stepIndex
    */
  
  /**
    * Drag and drop event for a step 
    * @param event
    * @param stepDefs
    * @param stepIndex
    */
  
  onDrop(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
    if (this.selectedCount(stepIndex) > 1) {
      var indices = event.item.data.indices;
      var change = event.currentIndex-event.previousIndex;

      let newList = []

      if (change > 0){
        let startOfList = this.getStepsList(stepDefs, stepIndex).slice(0, event.currentIndex+1)
        let middleOfList: StepType[] = []
        let endOfList = this.getStepsList(stepDefs, stepIndex).slice(event.currentIndex+1)
        indices.forEach((element) => {
          middleOfList.push(element.value)
        });
        let startOfListFiltered = startOfList.filter( ( el ) => !middleOfList.includes( el ) );
        let endOfListFiltered = endOfList.filter( ( el ) => !middleOfList.includes( el ) );
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
        let endOfListFiltered = endOfList.filter( ( el ) => !middleOfList.includes( el ) );
        startOfList.push(...middleOfList)
        startOfList.push(...endOfListFiltered)
        newList = startOfList
      }
      
      if (stepIndex === 0) {
          this.selectedScenario.stepDefinitions.given = newList
      } else if (stepIndex === 1) {
          this.selectedScenario.stepDefinitions.when = newList
      } else if (stepIndex === 2) {
          this.selectedScenario.stepDefinitions.then = newList
      }
      
    } else {
        moveItemInArray(this.getStepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
    }
    this.selectedScenario.saved = false;
  }

  /**
     * Maps all selected steps to their index
     * Sets dragging boolean
     * @param event
     * @param i 
     */
  dragStarted(event: CdkDragStart, i: number): void {
    this.dragging = event.source._dragRef;
    var indices = null;
    if (i === 0) {
        indices = this.selectedScenario.stepDefinitions.given
        .map(function(element, index) {return {index: index, value: element}})
        .filter(function(element) { return element.value.checked});
    } else if (i === 1) {
        indices = this.selectedScenario.stepDefinitions.when
        .map(function(element, index) {return {index: index, value: element}})
        .filter(function(element) { return element.value.checked});
    } else if (i === 2) {
        indices = this.selectedScenario.stepDefinitions.then
        .map(function(element, index) {return {index: index, value: element}})
        .filter(function(element) { return element.value.checked});
    }
    
    event.source.data = {
      indices,
      values: indices.map(a => a.index),
      source: this,
    };
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
  isSelected(i: number, j: number): any {
    if (i === 0) {
      return this.selectedScenario.stepDefinitions.given[j].checked;
    } else if (i === 1) {
        return this.selectedScenario.stepDefinitions.when[j].checked;
    } else if (i === 2) {
        return this.selectedScenario.stepDefinitions.then[j].checked;
    }
    return false;
  }

  /**
    * Returns count of all selected step from one stepDefinition
    * @param i 
    * @returns 
    */
   selectedCount(i: number) {
    var counter = 0
    if (i === 0) {
        this.selectedScenario.stepDefinitions.given.forEach(element => { if(element.checked){counter++;} });
    } else if (i === 1) {
        this.selectedScenario.stepDefinitions.when.forEach(element => { if(element.checked){counter++;} });
    } else if (i === 2) {
        this.selectedScenario.stepDefinitions.then.forEach(element => { if(element.checked){counter++;} });
    }
    return counter;
  }

  /**
    * Check all steps
    * @param temp_name
    * @param checkValue
    */
  checkAllSteps(temp_name, checkValue: boolean) {
    if (checkValue != null) {
        this.allChecked = checkValue;
    } else {
        this.allChecked = !this.allChecked;
    }
    if (this.allChecked) {        
        this.checkOnIteration(temp_name, true);

        this.activeActionBar = true;
        this.allChecked = true;
    } else  {
        this.checkOnIteration(temp_name,  false);

        this.activeActionBar = false;
        this.allChecked = false;
    }
  }

  checkOnIteration(temp_name, checkValue: boolean) {
    switch (temp_name) {
      case 'background':
        for (const prop in this.selectedScenario.stepDefinitions) {
          if(prop !== 'example') {
            for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                this.checkStep(this.selectedScenario.stepDefinitions[prop][i], checkValue);
            }
          } 
          else {
            //TODO Example case
            return
          }        
        }
        break;
      case 'scenario':
        for (const prop in this.selectedStory.background.stepDefinitions) {
          for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
            this.checkStep(this.selectedStory.background.stepDefinitions[prop][i], checkValue);
          }       
        }
        break;
    }
  }

  /**
   *  Handles checkboxes on click
   * @param event Click event
   * @param step Current step
   * @param step_id Check value
   * @param checkbox_id 
   * @param checkValue 
   */
  handleClick(event, step, step_id, checkbox_id, checkValue?: boolean) {
    // if key pressed is shift
    if (event.shiftKey && this.lastVisitedTemplate == this.templateName) {
      this.checkMany(step, step_id, checkbox_id);
    } else {
      this.checkStep(step, checkValue);
    }

    // Set current step to last checked
    this.lastCheckedCheckboxIDx = checkbox_id;
    this.lastVisitedTemplate = this.templateName;

  }

  /**
   * Checks many steps on shift click
   * @param currentStep
   * @param step_id
   * @param checkbox_id
   */
  checkMany(currentStep, step_id, checkbox_id) {
    let id = this.templateName+'_'+step_id+'_checkbox_'
    let newTmp:number = checkbox_id;  // current step id
    let lastTmp = this.lastCheckedCheckboxIDx;
    let start: number;
    let end: number;
    // Find in this block start and end step
    start = Math.min(newTmp, lastTmp); // get starting & ending array element
    end = Math.max(newTmp, lastTmp);
    
    // Check all steps in the list between start and end
    switch(this.templateName) {
      case 'scenario':
        this.allCheckboxes.forEach(checkbox => {      
          for (let i = start+1; i <= end; i++) {
            if (checkbox.nativeElement.id === id+i) {
              this.selectedScenario.stepDefinitions[currentStep.stepType][i].checked = !this.selectedScenario.stepDefinitions[currentStep.stepType][i].checked;
            }
          }
        });
        break;
        //TODO: No checkbox list
      case 'background':
        console.log(this.allCheckboxes);
        this.allCheckboxes.forEach(checkbox => {
          for (let i = start+1; i <= end; i++) {  
            console.log(id+i);  
            if (checkbox.nativeElement.id === id+i) {
              this.selectedStory.background.stepDefinitions[currentStep.stepType][i].checked = !this.selectedStory.background.stepDefinitions[currentStep.stepType][i].checked;     
            }
          }
        });
        break;
      case 'example':
        break;
    }
  }


  /**
  * Checks a step
  * @param step
  * @param checkValue
  */
  checkStep(step, checkValue?: boolean) {
    if (checkValue != null) {
        step.checked = checkValue;
    } else {
        step.checked = !step.checked;
    }
    let checkCount = 0;
    let stepCount = 0;

    switch(this.templateName) {
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
        break;

      case 'example':
        //TODO
        break;

    }

    this.allChecked = checkCount >= stepCount;
    if (checkCount <= 0) {
        this.allChecked = false;
        this.activeActionBar = false;
    } else {
        this.activeActionBar = true;
    }
  }

  /**
   * Returns the checked steptypes
   * @param steptypes 
   * @returns 
   */
  getChecked(steptypes) {
    return steptypes
      .map(function(element, index) {return {index: index, value: element}})
      .filter(function(element) { return element.value.checked});
  }

  updateScenario () {}

  addScenarioToStory(event) {}

  //Action bar methods 

  /**
     * Save a new block
     * @param temp_name
     */
  saveBlock(temp_name): void {

    const saveBlock = {given: [], when: [], then: [], example: []};

    switch (temp_name) {
      case 'background':
        for (const prop in this.selectedStory.background.stepDefinitions) {
            for (const s in this.selectedStory.background.stepDefinitions[prop]) {
               if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                   saveBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
               }
            }
        }
        break; 
        
      case 'scenario':
        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                    if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                        saveBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
                    }
                }
            }
        }
        break;
        //TODO
      case 'example':
        break;
    }

    const block: Block = {name: 'TEST', stepDefinitions: saveBlock};
    this.saveBlockModal.openSaveBlockFormModal(block, this);

  }

  /**
    * Deactivates all checked step
    * @param temp_name
    */
  deactivateStep(temp_name): void{
    switch (temp_name) {
      case 'background':
        for (const prop in this.selectedStory.background.stepDefinitions) {
          for (const s in this.selectedStory.background.stepDefinitions[prop]) {
              if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                  this.selectedStory.background.stepDefinitions[prop][s].deactivated = !this.selectedStory.background.stepDefinitions[prop][s].deactivated;
              }
          }
        }
        this.selectedStory.background.saved = false;
        break;
      
      case 'scenario':
        for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
              for (const s in this.selectedScenario.stepDefinitions[prop]) {
                  if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                      this.selectedScenario.stepDefinitions[prop][s].deactivated = !this.selectedScenario.stepDefinitions[prop][s].deactivated;
                  }
              }
          }
        }
        this.selectedScenario.saved = false;
        break;
        //TODO
      case 'example':
        break;
    }
  }

  /**
    * Removes a step
    * @param temp_name
    */
  removeStep (temp_name) {
    switch (temp_name) {
      case 'background':
        for (const prop in this.selectedStory.background.stepDefinitions) {
          for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
              if (this.selectedStory.background.stepDefinitions[prop][i].checked) {
                  this.selectedStory.background.stepDefinitions[prop].splice(i, 1);
              }
          }
        }
        this.selectedStory.background.saved = false;
        break;
      case 'scenario':
        for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
              for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                  if (this.selectedScenario.stepDefinitions[prop][i].checked) {
                      this.selectedScenario.stepDefinitions[prop].splice(i, 1);
                  }
              }
          }
        }
        this.selectedScenario.saved = false;
        break;
        //TODO
      case 'example':
        break;
    }
    this.allChecked = false;
    this.activeActionBar = false;
  }

  /**
     * Copy a block
     * @param temp_name
     */
  copyBlock(temp_name):void {

    const copyBlock = {given: [], when: [], then: [], example: []};

    switch (temp_name) {
      case 'background':
        for (const prop in this.selectedStory.background.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedStory.background.stepDefinitions[prop]) {
                    if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                        this.selectedStory.background.stepDefinitions[prop][s].checked = false;
                        copyBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
                    }
                }
            }
        }
        const backgroundBlock: Block = {stepDefinitions: copyBlock};
        sessionStorage.setItem('backgroundBlock', JSON.stringify(backgroundBlock));
        break;

      case 'scenario':
        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                    if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                        this.selectedScenario.stepDefinitions[prop][s].checked = false;
                        copyBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
                    }
                }
            }
        }
        const scenarioBlock: Block = {stepDefinitions: copyBlock};
        sessionStorage.setItem('scenarioBlock', JSON.stringify(scenarioBlock));
        break;
        //TODO
      case 'example':
        break;
    }
    this.allChecked = false;
    this.activeActionBar = false;
    this.toastr.success('successfully copied', 'Step(s)');

  }

  /**
   * Insert block from clipboard
   * @param temp_name 
   */
  insertCopiedBlock(temp_name): void{
    switch (temp_name) {
      case 'background':
        Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, index) => {
          this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
              this.selectedStory.background.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
          });
        });
        this.selectedStory.background.saved = false;
        break;

      case 'scenario':
        Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, index) => {
          this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
            if (key != 'example') {
              this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
            } else {
                //TODO: example
                /* if (!this.selectedScenario.stepDefinitions[key][0] || !this.selectedScenario.stepDefinitions[key][0].values.some(r => step.values.includes(r))) {
                  this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
                }
                if (j == 0) {
                  step.values.forEach(el => {
                    const s = '<' + el + '>';
                    if (!this.uncutInputs.includes(s)) {
                      this.uncutInputs.push(s);
                    }
                  });
                }
                this.exampleChild.updateTable(); */ 
            }
          });
        });
        this.selectedScenario.saved = false;
        break;

      default:
        break;
    }
  }

  /**
    * Opens add block modal
    * @param temp_name
    */
  addBlock( temp_name) {
    const id =  localStorage.getItem('id');
    switch(temp_name) {
      case 'background':
        this.addBlockModal.openAddBlockFormModal(temp_name, id);
        break;
      case 'scenario':
        this.addBlockModal.openAddBlockFormModal(temp_name, id);
        break;
        //TODO
      case 'example':
        break;
    } 
  }


}