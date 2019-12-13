import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Story } from '../model/Story';
import { environment } from '../../environments/environment'
import { StepDefinition } from '../model/StepDefinition';
import { StepType } from '../model/StepType';
import { ScenarioEditorComponent } from '../scenario-editor/scenario-editor.component';
import { Scenario } from '../model/Scenario';
import { Background } from '../model/Background';
import { JSONP_ERR_WRONG_RESPONSE_TYPE } from '@angular/common/http/src/jsonp';


describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
  })
    service = TestBed.get(ApiService);
    httpMock = TestBed.get(HttpTestingController);
    service.getBackendInfo();
});

  it('should be created', () => {
    const http: HttpClient = TestBed.get(HttpClient);
    const service: ApiService = new ApiService(http);
    expect(service).toBeTruthy();
  });

  it('should get Header', () => {
    const header: HttpHeaders = service.getHeader();
    expect(header.get('Access-Control-Allow-Origin')).toBe('*');
    expect(header.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('should get Repositories', () => {
    let dummyRepos = ["adessoCucumber/Cucumber","adessoCucumber/TestRepo"];
    let token = '124';
    let githubName = 'adessoCucumber';
    service.getRepositories(token, githubName).subscribe(repos => {
      expect(repos.length).toBe(2);
      expect(repos).toEqual(dummyRepos)
    });

    const request = httpMock.expectOne(environment.API_SERVER + '/repositories/' + githubName + '/' + token);
    expect(request.request.method).toBe('GET');
    request.flush(dummyRepos);
  });

  it('should get BackendInfo', () => {
    const backendInfo = {url: environment.API_SERVER}
    sessionStorage.removeItem('url_backend')
    service.getBackendInfo();
    const request = httpMock.expectOne(window.location.origin + '/backendInfo');
    expect(request.request.method).toBe('GET');
    request.flush(backendInfo);
    expect(sessionStorage.getItem('url_backend')).toBe(environment.API_SERVER);
    httpMock.verify();
  });

  it('should get Stories', () => {
    
    let dummyStories: Story[] = [{"story_id":502603476,"title":"Gratis Versand","body":"Als Premium Kunde erhalte ich freien Versand, wenn ich 5 B`cher bestelle","state":"open","issue_number":66,"assignee":"adessoCucumber","assignee_avatar_url":"https://avatars0.githubusercontent.com/u/50622173?v=4","scenarios":[{"scenario_id":1,"name":"Premium Kunde 5 Books","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Premium Customer"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["www.onlineshop.de"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Add 5 Books"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Delivery Options"]}],"then":[{"id":1,"mid":"in the textbox:","pre":"So I can see the text","stepType":"then","type":"Text","values":["Free Delivery","Delivery Costs"]}],"example":[]}}],"background":{"name":"New Background","stepDefinitions":{"when":[]}}}];
    let token = '124';
    let repository = 'adessoCucumber/Cucumber';
    service.getStories(repository, token).subscribe(repos => {
      expect(repos.length).toBe(1);
      expect(repos).toEqual(dummyStories);
    });

    const request = httpMock.expectOne(environment.API_SERVER + '/stories/' + repository + '/' + token);
    expect(request.request.method).toBe('GET');
    request.flush(dummyStories);
  });



  it('should get StepTypes', () => {
    let dummySteps: StepType[] = [{"_id":"5d765314aea0c94708a6e0a1","id":"",
    "stepType":"given","type":"Role","pre":"As a","mid":"","values":[""],
    "selection":["Guest","User"]},
    {"_id":"5d765314aea0c94708a6e0a2","id":"","stepType":"given","type":"Website",
    "pre":"I am on the website:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a3","id":"","stepType":"example",
    "type":"Add Variable","pre":"","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a4","id":"","stepType":"when","type":"Website",
    "pre":"I go to the website:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a5","id":"","stepType":"when","type":"Button",
    "pre":"I click the button:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a6","id":"","stepType":"when","type":"Field",
    "pre":"I insert","mid":"into the field","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0a7","id":"","stepType":"when","type":"Radio",
    "pre":"I select ","mid":"from the selection","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0a8","id":"","stepType":"when","type":"Dropdown",
    "pre":"I select the option","mid":"from the drop-down-menue","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0a9","id":"","stepType":"when",
    "type":"HoverOverAndSelect","pre":"I hover over the element",
    "mid":"and select the option","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0aa","id":"","stepType":"when","type":"Checkbox",
    "pre":"I select from the","mid":"multiple selection, the values","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0ab","id":"","stepType":"then","type":"Website",
    "pre":"So I will be navigated to the website:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0ac","id":"","stepType":"then","type":"Text",
    "pre":"So I can see the text","mid":"in the textbox:","values":["",""]}];
    service.getStepTypes().subscribe(stepTypes => {
      expect(stepTypes.length).toBe(12);
      expect(stepTypes).toEqual(dummySteps)
    });

    const request = httpMock.expectOne(service.apiServer + '/stepTypes');
    expect(request.request.method).toBe('GET');
    request.flush(dummySteps);
  });

  it('should add a Scenario', () => {
    let storyID = 5;
    let newScenario: Scenario = {"name": "New Scenario", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
    service.addScenario(storyID).subscribe(scenario => {
      expect(scenario).toEqual(newScenario)
    });

    const request = httpMock.expectOne(service.apiServer + '/scenario/add/' + storyID);
    expect(request.request.method).toBe('GET');
    request.flush(newScenario);
  });

  it('should update Background', () => {
    let storyID = 5;
    let updatedBackground: Background = {"name": "TestBackground", "stepDefinitions": {"when": []}};
    service.updateBackground(storyID, updatedBackground).subscribe(background => {
      expect(background).toEqual(updatedBackground)
    });

    const request = httpMock.expectOne(service.apiServer + '/background/update/' + storyID);
    expect(request.request.method).toBe('POST');
    request.flush(updatedBackground);
  });

  it('should update Scenaro', () => {
    let storyID = 5;
    let updatedScenario: Scenario = {"name": "New Scenario", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
    service.updateScenario(storyID, updatedScenario).subscribe(scenario => {
      expect(scenario).toEqual(updatedScenario)
    });

    const request = httpMock.expectOne(service.apiServer + '/scenario/update/' + storyID);
    expect(request.request.method).toBe('POST');
    request.flush(updatedScenario);
  });

  it('should delete Background', () => {
    let storyID = 5;
    service.deleteBackground(storyID).subscribe(response => {
      expect(response).toEqual({})
    });

    const request = httpMock.expectOne(service.apiServer + '/story/' + storyID + '/background/delete/');
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });

  it('should delete Scenario', () => {
    let storyID = 5;
    let deletedScenario: Scenario = {"name": "New Scenario", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
    service.deleteScenario(storyID, deletedScenario).subscribe(response => {
      expect(response).toEqual({})
    });

    const request = httpMock.expectOne(service.apiServer + '/story/' + storyID + '/scenario/delete/' + deletedScenario.scenario_id);
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });

  it('should run Tests Scenario', () => {
    let storyID = 5;
    let scenarioID = 2;
    let htmlResponse = '<h1>Test</h1>';
    service.runTests(storyID, scenarioID).subscribe(response => {
      expect(response).toEqual(htmlResponse)
    });

    const request = httpMock.expectOne(service.apiServer + '/runScenario/' + storyID + '/' + scenarioID);
    expect(request.request.method).toBe('GET');
    request.flush(htmlResponse);
  });

  it('should run Tests Feature/Story', () => {
    let storyID = 5;
    let scenarioID;
    let htmlResponse = '<h1>Test</h1>';
    service.runTests(storyID, scenarioID).subscribe(response => {
      expect(response).toEqual(htmlResponse)
    });

    const request = httpMock.expectOne(service.apiServer + '/runFeature/' + storyID);
    expect(request.request.method).toBe('GET');
    request.flush(htmlResponse);
  });

  it('should be logged in', () => {
    localStorage.setItem('token', '1234567890');
    let loggedIn = service.isLoggedIn();
    expect(loggedIn).toBeTruthy();
  });

  it('should be not logged in', () => {
    localStorage.removeItem('token');
    let loggedIn = service.isLoggedIn();
    expect(loggedIn).toBeFalsy();
  });

});
