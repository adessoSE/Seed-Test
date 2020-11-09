import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { Scenario } from '../model/Scenario';

@Component({
  selector: 'app-example-table',
  templateUrl: './example-table.component.html',
  styleUrls: ['./example-table.component.css']
})
export class ExampleTableComponent implements OnInit {

  displayedColumns: string[] = [];
  data = [];
  controls: FormArray;
  selectedScenario: Scenario;
  exampleThere: boolean = false;

  @Output()
  removeRowIndex: EventEmitter<number> = new EventEmitter();

  constructor() {}

  ngOnInit() {

  }

  @Input()
  set newSelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
    if (this.selectedScenario.stepDefinitions.example.length > 0) {
      this.initializeTable();
      this.initializeTableControls();
      this.exampleThere = true;
    } else {
      this.exampleThere = false;
    }
  }

  inputChange(){
    this.selectedScenario.saved = false;
  }

  initializeTableControls() {
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

  updateField(columnIndex: number, rowIndex: number, field: string) {
    const control = this.getControl(rowIndex, field);
    if (control.valid) {
      this.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex] = control.value;
      this.initializeTable();
    } else {
      console.log('CONTROL NOT VALID');
    }
   }

  getControl(rowIndex: number, fieldName: string): FormControl {
    return this.controls.at(rowIndex).get(fieldName) as FormControl;
  }

  updateTable() {
    if (this.selectedScenario.stepDefinitions.example[1]) {
      this.exampleThere = true;
      this.initializeTable();
      this.initializeTableControls();
    } else {
      this.exampleThere = false;
    }
  }

  removeRow(rowIndex: number) {
    this.removeRowIndex.emit(rowIndex + 1 );
  }
}
