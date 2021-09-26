import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { Scenario } from '../model/Scenario';

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
   * selected Scenario
   */
  selectedScenario: Scenario;

  /**
   * Boolean if the example table should be shown or not
   */
  exampleThere: boolean = false;

  /**
   * Event emitter to check if ththe example table should be removed or added to
   */
  @Output()
  checkRowIndex: EventEmitter<number> = new EventEmitter();

  /**
   * @ignore
   */
  constructor() {}

    /**
   * @ignore
   */
  ngOnInit() {}

  /**
   * Sets the new scenario
   */
  @Input()
  set newSelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
    this.updateTable();
  }

  /**
   * Sets the status of the scenario to not saved
   */
  inputChange(){
    this.selectedScenario.saved = false;
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
    this.displayedColumns = this.selectedScenario.stepDefinitions.example[0].values;
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
      this.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex] = control.value;
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

}
