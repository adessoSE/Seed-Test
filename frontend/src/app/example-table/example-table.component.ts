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

  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSource = this.core.list$;
  data = [];
  controls: FormArray;
  selectedScenario : Scenario;
  constructor(private core: CoreService){}

  ngOnInit() {

    for(var i = 1 ; i < this.selectedScenario.stepDefinitions.example[0].values.length; i++){
      var js= {};
      for(var j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ){
        js[this.selectedScenario.stepDefinitions.example[0].values[j]] = this.selectedScenario.stepDefinitions.example[i].values[j];
      }
      console.log("js: " + JSON.stringify(js));
      this.data.push(js);
    }
    //data2: BehaviorSubject<>= new BehaviorSubject(data);
    console.log("data: " + JSON.stringify(this.data));
   
    /*const toGroups = this.core.list$.value.map(entity => {
      return new FormGroup({
        position:  new FormControl(entity.position, Validators.required),
        name: new FormControl(entity.name, Validators.required), 
        weight: new FormControl(entity.weight, Validators.required),
        symbol: new FormControl(entity.symbol, Validators.required)
      },{updateOn: "blur"});
    });*/
    this.displayedColumns = this.selectedScenario.stepDefinitions.example[0].values;
    
    console.log("example: " + this.selectedScenario.stepDefinitions.example[1].values);
    var cont1 = new FormControl(this.selectedScenario.stepDefinitions.example[1].values[0])
    var cont2 = new FormControl(this.selectedScenario.stepDefinitions.example[1].values[1])
    var cont3 = new FormControl(this.selectedScenario.stepDefinitions.example[1].values[2])

    const toGroups = new FormGroup({name: cont1,position: cont2,website: cont3});
   /* const toGroups = this.selectedScenario.stepDefinitions.example.value.map(entity =>{
      console.log("entity: " + entity);
      return new FormGroup({
        position: new FormControl(entity.values[0]),
        name: new FormControl(entity.values[1]),
        weight: new FormControl(entity.values[2]),
        symbol: new FormControl(entity.values[0])

      })
    })*/
    console.log(toGroups);
    this.controls = new FormArray([toGroups]);

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

  getControl(index, fieldName) {
    const a  = this.controls.at(index).get(fieldName) as FormControl;
    return this.controls.at(index).get(fieldName) as FormControl;
  }

}