import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StoriesBarComponent } from './stories-bar.component';

describe('StoriesBarComponent', () => {
  let component: StoriesBarComponent;
  let fixture: ComponentFixture<StoriesBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ StoriesBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StoriesBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('sorted Stories', async () => {
    let sorted = [{issue_number: 123, name: 'test2', story_id: '1231', 
    background: {name: 'testBackground2', stepDefinitions: {when: 'testWhen2'}}, 
    scenarios: [{scenario_id: 789, name: 'scenarioName2', 
    stepDefinitions: {given:[], when: [], then: [], example: []}}]},
    {issue_number: 321, name: 'test1', story_id: '1231', 
    background: {name: 'testBackground1', stepDefinitions: {when: 'testWhen'}}, 
    scenarios: [{scenario_id: 456, name: 'scenarioName', 
    stepDefinitions: {given:[], when: [], then: [], example: []}}]}];

    component.stories = [{issue_number: 321, name: 'test1', story_id: '1231', 
      background: {name: 'testBackground1', stepDefinitions: {when: 'testWhen'}}, 
      scenarios: [{scenario_id: 456, name: 'scenarioName', 
      stepDefinitions: {given:[], when: [], then: [], example: []}}]}, 
      {issue_number: 123, name: 'test2', story_id: '1231', 
      background: {name: 'testBackground2', stepDefinitions: {when: 'testWhen2'}}, 
      scenarios: [{scenario_id: 789, name: 'scenarioName2', 
      stepDefinitions: {given:[], when: [], then: [], example: []}}]}];
  

  component.sortedStories();
  expect(component.stories).toEqual(sorted);
  });
  
});
