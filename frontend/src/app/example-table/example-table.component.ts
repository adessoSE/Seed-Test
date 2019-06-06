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
      for(var i = 1 ; i < this.selectedScenario.stepDefinitions.example.length; i++){
        var js= {};
        for(var j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ){
          js[this.selectedScenario.stepDefinitions.example[0].values[j]] = this.selectedScenario.stepDefinitions.example[i].values[j];
        }
        console.log("js: " + JSON.stringify(js));
        this.data.push(js);
      }
      //data2: BehaviorSubject<>= new BehaviorSubject(data);
      console.log("data: " + JSON.stringify(this.data));
    
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

  updateField(index, field) {
    const control = this.getControl(index, field);
    if (control.valid) {
      this.core.update(index,field,control.value);
    }

   }

  getControl(index, fieldName): FormControl {
    console.log("column name: " + fieldName + " index: " + index);
    //const a  = this.controls.at(index).get(fieldName) as FormControl;
    //console.log("controls: " + JSON.stringify(this.controls));
    
    //console.log("found control: " + JSON.stringify( this.controls.at(index).get(fieldName) as FormControl));
    return this.controls.at(index).get(fieldName) as FormControl;
  }

}