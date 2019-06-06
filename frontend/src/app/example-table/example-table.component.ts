import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { CoreService } from '../Services/core.service';
import { Scenario } from '../model/Scenario';
import { Story } from '../model/Story';
import { BehaviorSubject } from 'rxjs';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

@Component({
  selector: 'app-example-table',
  templateUrl: './example-table.component.html',
  styleUrls: ['./example-table.component.css']
})
export class ExampleTableComponent implements OnInit {

  displayedColumns: string[] = [];
  dataSource = this.core.list$;
  data = [];
  controls: FormArray;
  selectedScenario : Scenario;
  constructor(private core: CoreService){}

  ngOnInit() {
    if(this.selectedScenario.stepDefinitions.example.length > 0){
      this.initializeTable();
      //data2: BehaviorSubject<>= new BehaviorSubject(data);
      //console.log("data: " + JSON.stringify(this.data));
    
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
  }

  @Input()
  set newSelectedScenario(scenario: Scenario){
    this.selectedScenario = scenario;    
    console.log("example table scenario is set");
  }

  initializeTable(){
    this.data = [];
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
    //const a  = this.controls.at(index).get(fieldName) as FormControl;
    //console.log("controls: " + JSON.stringify(this.controls));
    
    //console.log("found control: " + JSON.stringify( this.controls.at(index).get(fieldName) as FormControl));
    return this.controls.at(rowIndex).get(fieldName) as FormControl;
  }

  async addToValues(input: string, stepType,step, index, valueIndex? ) {

    //await this.checkForExamples(input,step);

    console.log("steptype: " + stepType)
    console.log("add to values: " + input);

    this.selectedScenario.stepDefinitions.example[index].values[valueIndex] = input;

    
  }

}