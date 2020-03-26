import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ExampleTableComponent } from './example-table.component';
import { EditableComponent } from '../editable/editable.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatTableModule} from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Scenario } from '../model/Scenario';
import { compileComponentFromMetadata } from '@angular/compiler';


describe('ExampleTableComponent', () => {
  let component: ExampleTableComponent;
  let fixture: ComponentFixture<ExampleTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, DragDropModule, MatTableModule],
      declarations: [ ExampleTableComponent, EditableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExampleTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('create', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  })

  describe('set newSelectedScenario', () => {
    it('should setSelectedScenario with examples', () => {
      let selectedScenario: Scenario = {"scenario_id": 123,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};    
      fixture.componentInstance.newSelectedScenario = selectedScenario;
      expect(component.selectedScenario).toBe(selectedScenario);
      expect(component.exampleThere).toBeTruthy();
    })
  
    it('should setSelectedScenario without examples', () => {
      let selectedScenario: Scenario = {"name": "New Scenario","comment":"", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
      fixture.componentInstance.newSelectedScenario = selectedScenario;
      expect(component.selectedScenario).toBe(selectedScenario);
      expect(component.exampleThere).toBeFalsy();
    })
  })

  describe('initializeTable', () => {
    it('should initialize Table', () => {
      let selectedScenario: Scenario = {"scenario_id": 123,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};    
      component.selectedScenario = selectedScenario;
      component.initializeTable();
      expect(component.data).toBeDefined();
      expect(component.data.length).toBe(3);
    });
  })

  describe('initializeTableControls', () => {
    it('should initialize Table Controls', () => {
      let selectedScenario: Scenario = {"scenario_id": 123,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};    
      component.selectedScenario = selectedScenario;
      component.initializeTableControls();
      expect(component.displayedColumns).toBe(selectedScenario.stepDefinitions.example[0].values);
      expect(component.controls).toBeDefined();
      expect(component.controls.length).toBe(3);
    });
  })

  describe('updateField', () => {
    it('should update Field', () => {
      let selectedScenario: Scenario = {"scenario_id": 123,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};    
      component.selectedScenario = selectedScenario;
      let field = 'password';
      let columnIndex = 1;
      let rowIndex = 1;
      component.initializeTable();
      component.initializeTableControls();
      spyOn(component, "initializeTable")
      component.updateField(columnIndex, rowIndex, field);
      expect(component.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex]).toBe(component.controls.at(rowIndex).get(field).value)
      expect(component.initializeTable).toHaveBeenCalledTimes(1);  
    })
  })
  
  describe('getControl', () => {
    it('should getControl', () => {
      let selectedScenario: Scenario = {"scenario_id": 123,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};    
      component.selectedScenario = selectedScenario;
      let field = 'password';
      let columnIndex = 1;
      let rowIndex = 1;
      component.initializeTable();
      component.initializeTableControls();
      const control = component.getControl(rowIndex, field);
      expect(component.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex]).toBe(component.controls.at(rowIndex).get(field).value)
      expect(control.valid).toBeTruthy();
    })
  })

  describe('updateTable', () => {
    it('should update Table', () => {
      let selectedScenario: Scenario = {"scenario_id": 123,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};    
      component.selectedScenario = selectedScenario;
      component.updateTable();
      expect(component.exampleThere).toBeTruthy();
    });
  
    it('should not update Table', () => {
      let selectedScenario: Scenario = {"name": "New Scenario","comment":"", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
      component.selectedScenario = selectedScenario;
      component.updateTable();
      expect(component.exampleThere).toBeFalsy();
    });
  })

  describe('removeRow', () => {
    it('should remove Row', () => {
      let rowIndex = 2;
      spyOn(component.removeRowIndex, 'emit');
      component.removeRow(rowIndex);
      expect(component.removeRowIndex.emit).toHaveBeenCalledWith(rowIndex+1);
    });
  })
});



