import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StoriesBarComponent } from './stories-bar.component';
import { of } from 'rxjs';

describe('StoriesBarComponent', () => {
  let component: StoriesBarComponent;
  let fixture: ComponentFixture<StoriesBarComponent>;
  let storiesForAll = [{story_id:502603476,title:"Gratis Versand",
  body:"Als Premium Kunde erhalte ich freien Versand, wenn ich 5 BÜcher bestelle",
  state:"open",issue_number:66,assignee:"adessoCucumber",
  assignee_avatar_url:"https://avatars0.githubusercontent.com/u/50622173?v=4",
  scenarios:[{scenario_id:1,comment:"",name:"Premium Kunde 5 Books",
  stepDefinitions:{given:[{id:1,mid:"",pre:"As a",stepType:"given",type:"Role",
  values:["Premium Customer"]},{id:2,"mid":"",pre:"I am on the website:",stepType:"given",
  type:"Website",values:["www.onlineshop.de"]}],when:[{id:1,mid:"",
  pre:"I click the button:",stepType:"when",type:"Button",values:["Add 5 Books"]},
  {id:2,mid:"",pre:"I click the button:",stepType:"when",type:"Button",
  values:["Delivery Options"]}],then:[{id:1,mid:"in the textbox:",
  pre:"So I can see the text",stepType:"then",type:"Text",
  values:["Free Delivery","Delivery Costs"]}],example:[]}}],
  background:{name:"New Background",stepDefinitions:{when:[]}}},
  {"story_id":501324078,"title":"Seed-Test","body":"Test the our own website","state":"open",
  issue_number:55,assignee:"adessoCucumber",
  assignee_avatar_url:"https://avatars0.githubusercontent.com/u/50622173?v=4",
  scenarios:[{scenario_id:1,comment:"",name:"Create Scenario",stepDefinitions:{given:[{id:1,mid:"",
  pre:"I am on the website:",stepType:"given",type:"Website",
  values:["https://cucumber-app.herokuapp.com/login"]}],"when":[{"id":1,"mid":"",
  pre:"I click the button:",stepType:"when",type:"Button",values:["loginTestButton"]},
  {id:2,mid:"",pre:"I click the button:",stepType:"when",type:"Button",values:["repository_0"]},
  {id:3,mid:"",pre:"I click the button:",stepType:"when",type:"Button",values:["story0"]},
  {id:4,mid:"",pre:"I click the button:",stepType:"when",type:"Button",values:["story_add_scenario0"]}],
  then:[{id:1,mid:"",pre:"So I will be navigated to the website:",stepType:"then",
  type:"Website",values:["https://cucumber-app.herokuapp.com/#"]}],example:[]}},
  {scenario_id:2,comment:"",name:"New Scenario",stepDefinitions:{given:[],when:[],then:[],example:[]}}],
  background:{name:"New Background",stepDefinitions:{when:[]}}}];
  

  //beforeEach(async(() => {
  //  TestBed.configureTestingModule({
  //    imports: [HttpClientTestingModule],
  //    declarations: [ StoriesBarComponent ]
  //  })
  //  .compileComponents();
  //}));
//
  //beforeEach(() => {
  //  fixture = TestBed.createComponent(StoriesBarComponent);
  //  component = fixture.componentInstance;
  //  fixture.detectChanges();
  //});
//
  //it('should create', () => {
  //  expect(component).toBeTruthy();
  //});
  //
  //describe('sortedStories', function(){
  //  it('should return the stories sorted', async () => {
  //    let sorted = [{"story_id":501324078,"title":"Seed-Test","body":"Test the our own website","state":"open","issue_number":55,"assignee":"adessoCucumber","assignee_avatar_url":"https://avatars0.githubusercontent.com/u/50622173?v=4","scenarios":[{"scenario_id":1,"comment":"","name":"Create Scenario","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://cucumber-app.herokuapp.com/login"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["loginTestButton"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["repository_0"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story_add_scenario0"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["https://cucumber-app.herokuapp.com/#"]}],"example":[]}},{"scenario_id":2,"comment":"","name":"New Scenario","stepDefinitions":{"given":[],"when":[],"then":[],"example":[]}}],"background":{"name":"New Background","stepDefinitions":{"when":[]}}},{"story_id":502603476,"title":"Gratis Versand","body":"Als Premium Kunde erhalte ich freien Versand, wenn ich 5 BÜcher bestelle","state":"open","issue_number":66,"assignee":"adessoCucumber","assignee_avatar_url":"https://avatars0.githubusercontent.com/u/50622173?v=4","scenarios":[{"scenario_id":1,"comment":"","name":"Premium Kunde 5 Books","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Premium Customer"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["www.onlineshop.de"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Add 5 Books"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Delivery Options"]}],"then":[{"id":1,"mid":"in the textbox:","pre":"So I can see the text","stepType":"then","type":"Text","values":["Free Delivery","Delivery Costs"]}],"example":[]}}],"background":{"name":"New Background","stepDefinitions":{"when":[]}}}];
  //    component.stories = storiesForAll;
  //    component.getSortedStories();
  //    expect(component.stories).toEqual(sorted);
  //  });
  //});
//
  //describe('selectScenario', function(){
  //  afterEach(function(){
  //    component.selectedScenario = undefined;
  //  });
//
  //  it('should set the selected scenario', function(){
  //    let scenario = {scenario_id:2,comment:"",name:"New Scenario",stepDefinitions:{given:[],when:[],then:[],example:[]}};
  //    let storyID = null;
  //    component.selectScenario(storyID, scenario);
  //    expect(component.selectedScenario).toBe(scenario);
  //  });
  //});
//
  //describe('selectStoryScenario', function(){
//
  //  beforeEach(function(){
  //    component.stories = storiesForAll;
  //  })
//
  //  afterEach(function(){
  //    component.stories = undefined;
  //  })
//
  //  it('should set the story and the scenario', function(){
  //    let story = component.stories[0];
  //    spyOn(component, 'selectScenario');
  //    
  //    component.selectStoryScenario(story);
  //    expect(component.selectScenario).toHaveBeenCalled();
  //    expect(component.selectedStory).toEqual(story);
  //  });
//
  //  it('should not call select Scenario', function(){
  //    let story = component.stories[0];
  //    story.scenarios = [];
  //    spyOn(component, 'selectScenario');
  //    
  //    component.selectStoryScenario(story);
  //    expect(component.selectScenario).not.toHaveBeenCalled();
  //    expect(component.selectedStory).toBe(story);
  //  });
  //})
});
