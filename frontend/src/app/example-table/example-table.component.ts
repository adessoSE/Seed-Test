import { Component, OnInit, Input, ViewChild, Output ,EventEmitter } from '@angular/core';
import { FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Scenario } from '../model/Scenario';
import { Story } from '../model/Story';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-example-table',
  templateUrl: './example-table.component.html',
  styleUrls: ['./example-table.component.css']
})
export class ExampleTableComponent implements OnInit {

  displayedColumns: string[] = [];
  data = [];
  controls: FormArray;
  selectedScenario : Scenario;
  exampleThere: boolean = false;
  editorLocked = true;

  @Output()
  removeRowIndex: EventEmitter<number> = new EventEmitter();

  constructor(){}

  ngOnInit() {

  }

  @Input()
  set newSelectedScenario(scenario: Scenario){
    this.selectedScenario = scenario;
    if(this.selectedScenario.stepDefinitions.example.length > 0){
      this.initializeTable();
      this.initializeTableControls();
      this.exampleThere = true;
    }else{
      this.exampleThere = false;
    }
    console.log("example table scenario is set");
  }

  @Input()
  set setEditorLocked(editorLocked: boolean){
    this.editorLocked = editorLocked;
  }

  initializeTableControls(){
    this.displayedColumns = this.selectedScenario.stepDefinitions.example[0].values;

    var formArray: FormGroup[] = [];
    for(var i = 1 ; i < this.selectedScenario.stepDefinitions.example.length; i++){
      var toGroups = new FormGroup({},{updateOn: "blur"});
      for(var j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ){
        var cont1 = new FormControl(this.selectedScenario.stepDefinitions.example[i].values[j])
        toGroups.addControl(this.selectedScenario.stepDefinitions.example[0].values[j], cont1);

      }
      formArray.push(toGroups)
    }

    this.controls = new FormArray(formArray);
  }

  initializeTable(){
    this.data = [];
    //console.log("table: " + JSON.stringify(this.selectedScenario.stepDefinitions.example));
    for(var i = 1 ; i < this.selectedScenario.stepDefinitions.example.length; i++){
      var js= {};
      for(var j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ){
        js[this.selectedScenario.stepDefinitions.example[0].values[j]] = this.selectedScenario.stepDefinitions.example[i].values[j];
      }
      //console.log("js: " + JSON.stringify(js));
      this.data.push(js);
    }
  }

  updateField(columnIndex, rowIndex, field) {
    const control = this.getControl(rowIndex, field);
    //console.log("control: " + JSON.stringify(control));
    if (control.valid) {
      console.log("columnIndex: " + columnIndex + " rowIndex: " + rowIndex);
      console.log("control value: " + control.value);
      this.selectedScenario.stepDefinitions.example[rowIndex+1].values[columnIndex] = control.value;
      this.initializeTable();

      //this.core.update(index,field,control.value);
    }else{
      console.log("CONTROL NOT VALID")
    }



   }

  getControl(rowIndex, fieldName): FormControl {
    console.log("column name: " + fieldName + " index: " + rowIndex);
    return this.controls.at(rowIndex).get(fieldName) as FormControl;
  }

  addToValues(input: string, stepType,step, index, valueIndex? ) {
    this.selectedScenario.stepDefinitions.example[index].values[valueIndex] = input;
  }
  updateTable(){
    console.log("updateTable");
    if(this.selectedScenario.stepDefinitions.example[1]){
      this.exampleThere = true;
      this.initializeTable()
      this.initializeTableControls();
    }else{
      this.exampleThere =false;
    }
  }

  removeRow(rowIndex: number){
    console.log("remove row: " + rowIndex);
    this.removeRowIndex.emit(rowIndex +1 );
  }

}