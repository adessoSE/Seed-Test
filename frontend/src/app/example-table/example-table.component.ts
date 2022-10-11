import { ApiService } from 'src/app/Services/api.service';
import { Subscription } from 'rxjs';
import { DeleteExampleToast } from './../deleteExample-toast';
import { NewExampleComponent } from './../modals/new-example/new-example.component';
import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { Scenario } from '../model/Scenario';
import { ToastrService } from 'ngx-toastr';
import { Story } from '../model/Story';
import { StepType } from '../model/StepType';


@Component({
  selector: 'app-example',
  template: `<app-base-editor [templateName]="TEMPLATE_NAME" [testRunning]="testRunning" [newlySelectedScenario]="selectedScenario"
  [newlySelectedStory]="selectedStory" [originalStepTypes]="originalStepTypes"></app-base-editor>
  `,
  styleUrls: ['./example-table.component.css'],
  
})

/* Example component */
export class ExampleComponent{

  selectedScenario;

  selectedStory;

  @Input() originalStepTypes: StepType[];

  @Input() templateName: string;

  /**
    * If the test is running
    */
  @Input() testRunning: boolean;

  /**
    * Sets a new selected story
    */
  @Input()
  set newlySelectedStory(story: Story) {
    this.selectedStory = story;
  }

  /**
    * Sets a new selected scenaio
    */
  @Input()
  set newlySelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
  }

  readonly TEMPLATE_NAME ='example';

}


/**
 * Component of for the Example Table
 */
@Component({
  selector: 'app-example-table',
  templateUrl: './example-table.component.html',
  styleUrls: ['./example-table.component.css']
})
export class ExampleTableComponent implements OnInit {

  /**
   * Columns which are displayed in the table
   */
  displayedColumns: string[] = [];
  /**
   * Data of the table entries
   */
  data = [];

  /**
   * Controls of the table
   */
  controls: FormArray;

  /**
   * Last row to render add button
   */
  lastRow

  /**
   * selected Scenario
   */
  selectedScenario: Scenario;

  /**
   * Boolean if the example table should be shown or not
   */
  exampleThere: boolean = false;

  deleteExampleObservable: Subscription;

  indexOfExampleToDelete;

  /**
   * Event emitter to check if ththe example table should be removed or added to
   */
  @Output()
  checkRowIndex: EventEmitter<number> = new EventEmitter();

  /**
   * Sets the new scenario
   */
  @Input()
  set newSelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
    this.updateTable();
  }

  @Input() isDark: boolean;

  @ViewChild('newExampleModal') newExampleModal: NewExampleComponent;

  /**
    * Event emitter to delete the example
    */
  @Output()
  deleteExampleEvent: EventEmitter<Scenario> = new EventEmitter();

    /**
   * @ignore
   */
     constructor( public apiService: ApiService, private toastr: ToastrService) {}

     /**
    * @ignore
    */
  ngOnInit() {
    this.deleteExampleObservable = this.apiService.deleteExampleEvent.subscribe(() => {this.deleteExampleFunction();});
    //this.lastRow = this.selectedScenario.stepDefinitions.example.slice(-1)[0];
  }
 
  ngOnDestroy() {
    if (!this.deleteExampleObservable.closed) {
      this.deleteExampleObservable.unsubscribe();
    }
  }

  /**
    * Adds a value to every example
    */
  addRowToExamples(){
    let row = JSON.parse(JSON.stringify(this.selectedScenario.stepDefinitions.example[0]))
      row.values.forEach((value, index) => {
        row.values[index] = 'value'
      });
      this.selectedScenario.stepDefinitions.example.push(row)
      this.updateTable();
      this.selectedScenario.saved = false;
  }


  /**
   * Sets the status of the scenario to not saved and overrides value of example
   */
   inputChange(rowIndex, columnIndex, column){
    this.selectedScenario.saved = false;
    
    const getCircularReplacer = () => {
      const seen = new WeakSet;
      return (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return;
          }
          seen.add(value);
        }
        return value;
      };
    };

    let reference = JSON.parse(JSON.stringify(this.controls.at(rowIndex).get(column), getCircularReplacer()));
    this.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex-1] = reference._pendingValue
  }

  /**
   * Initializes the controls of the table
   */
  initializeTableControls() {
    //let seen = new Set<string>();
    //this.selectedScenario.stepDefinitions.example[0].values.filter(item => {
    //    let k = item;
    //    return seen.has(k) ? false : seen.add(k);
    //});
    //this.selectedScenario.stepDefinitions.example[0].values = Array.from(seen);
    this.displayedColumns = [" "].concat(this.selectedScenario.stepDefinitions.example[0].values);
    const formArray: FormGroup[] = [];
    for (let i = 1 ; i < this.selectedScenario.stepDefinitions.example.length; i++) {
      let toGroups = new FormGroup({},{updateOn: 'blur'});
      for (let j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ) {
        let cont1 = new FormControl(this.selectedScenario.stepDefinitions.example[i].values[j]);
        toGroups.addControl(this.selectedScenario.stepDefinitions.example[0].values[j], cont1);

      }
      formArray.push(toGroups);
    }

    this.controls = new FormArray(formArray);
  }
  
  /**
   * Initializes the data of the table
   */
  initializeTable() {
    this.data = [];
    for (let i = 1 ; i < this.selectedScenario.stepDefinitions.example.length; i++) {
      let js= {};
      for (let j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ) {
        js[this.selectedScenario.stepDefinitions.example[0].values[j]] = this.selectedScenario.stepDefinitions.example[i].values[j];
      }
      this.data.push(js);
    }
  }

  /**
   * Updates a field of the table
   * @param columnIndex index of the column of the changed value
   * @param rowIndex index of the row of the changed value
   * @param field name of the changed value column
   */
  updateField(columnIndex: number, rowIndex: number, field: string) {
    const control = this.getControl(rowIndex, field);
    if (control.valid) {
      this.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex-1] = control.value;
      this.initializeTable();
    } else {
      console.log('CONTROL NOT VALID');
    }
   }

   /**
    * Get the controls of a specific cell
    * @param rowIndex index of the row
    * @param fieldName name of the cell column
    * @returns FormControl of the cell
    */
  getControl(rowIndex: number, fieldName: string): FormControl {
    return this.controls.at(rowIndex).get(fieldName) as FormControl;
  }

  /**
   * Updates the table controls and data
   */
  updateTable() {
    if (this.selectedScenario.stepDefinitions.example[1]) {
      this.exampleThere = true;
      this.initializeTable();
      this.initializeTableControls();
      this.lastRow = this.selectedScenario.stepDefinitions.example.slice(-1)[0];
      this.apiService.scenarioChangedEmitter();
    } else {
      this.exampleThere = false;
    }
  }

  /**
   * Emits an event to check if the example table should be removed
   * @param event change event
   * @param rowIndex row index of the changed cell
   */
  checkExample(event, rowIndex){
    this.checkRowIndex.emit(rowIndex + 1)
  }

  renameExample(columnIndex){
    this.newExampleModal.renameExample(this.selectedScenario, columnIndex-1);
    this.updateTable();
  }

  /**
   * Emitts the delete scenario event
   * @param event
   */
  deleteExample(event, columnIndex) {
    this.indexOfExampleToDelete = columnIndex-1
    this.deleteExampleEvent.emit();
    this.showDeleteExampleToast(event)
  }

  /**
   * Opens the delete example toast
   * @param scenario
   */
   showDeleteExampleToast(scenario: Scenario) {
    this.toastr.warning('', 'Do you really want to delete this example?', {
        toastComponent: DeleteExampleToast
    });
  }

  deleteExampleFunction(){
    let oldName = this.selectedScenario.stepDefinitions.example[0].values[this.indexOfExampleToDelete]
    this.selectedScenario.stepDefinitions.example.forEach((value, index) => {
      this.selectedScenario.stepDefinitions.example[index].values.splice(this.indexOfExampleToDelete, 1)
    })

    if(this.selectedScenario.stepDefinitions.example[0].values.length == 0){
      this.selectedScenario.stepDefinitions.example = []
    }

    this.selectedScenario.stepDefinitions.given.forEach((value, index) => {
      value.values.forEach((val, i) => {
        if(val == '<'+oldName+'>'){
          this.selectedScenario.stepDefinitions.given[index].values[i] = ""
          this.selectedScenario.stepDefinitions.given[index].isExample[i] = undefined
        }
      })
    })

    this.selectedScenario.stepDefinitions.when.forEach((value, index) => {
      value.values.forEach((val, i) => {
        if(val == '<'+oldName+'>'){
          this.selectedScenario.stepDefinitions.when[index].values[i] = ""
          this.selectedScenario.stepDefinitions.when[index].isExample[i] = undefined
        }
      })
    })

    this.selectedScenario.stepDefinitions.then.forEach((value, index) => {
      value.values.forEach((val, i) => {
        if(val == '<'+oldName+'>'){
          this.selectedScenario.stepDefinitions.then[index].values[i] = ""
          this.selectedScenario.stepDefinitions.then[index].isExample[i] = undefined
        }
      })
    })

    this.updateTable()
    this.selectedScenario.saved = false;
  }

}
