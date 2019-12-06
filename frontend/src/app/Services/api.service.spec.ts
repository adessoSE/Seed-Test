import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { Story } from '../model/Story';
import { environment } from '../../environments/environment'
import { StepDefinition } from '../model/StepDefinition';


describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
  })
    service = TestBed.get(ApiService);
    httpMock = TestBed.get(HttpTestingController);
});

  it('should be created', () => {
    const http: HttpClient = TestBed.get(HttpClient);
    const service: ApiService = new ApiService(http);
    expect(service).toBeTruthy();
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

  /*it('should get StepDefinitions', () => {
    let dummySteps: StepDefinition = [{"_id":"5d765314aea0c94708a6e0a1","id":"","stepType":"given","type":"Role","pre":"As a","mid":"","values":[""],"selection":["Guest","User"]},{"_id":"5d765314aea0c94708a6e0a2","id":"","stepType":"given","type":"Website","pre":"I am on the website:","mid":"","values":[""]},{"_id":"5d765314aea0c94708a6e0a3","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":[""]},{"_id":"5d765314aea0c94708a6e0a4","id":"","stepType":"when","type":"Website","pre":"I go to the website:","mid":"","values":[""]},{"_id":"5d765314aea0c94708a6e0a5","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]},{"_id":"5d765314aea0c94708a6e0a6","id":"","stepType":"when","type":"Field","pre":"I insert","mid":"into the field","values":["",""]},{"_id":"5d765314aea0c94708a6e0a7","id":"","stepType":"when","type":"Radio","pre":"I select ","mid":"from the selection","values":["",""]},{"_id":"5d765314aea0c94708a6e0a8","id":"","stepType":"when","type":"Dropdown","pre":"I select the option","mid":"from the drop-down-menue","values":["",""]},{"_id":"5d765314aea0c94708a6e0a9","id":"","stepType":"when","type":"HoverOverAndSelect","pre":"I hover over the element","mid":"and select the option","values":["",""]},{"_id":"5d765314aea0c94708a6e0aa","id":"","stepType":"when","type":"Checkbox","pre":"I select from the","mid":"multiple selection, the values","values":["",""]},{"_id":"5d765314aea0c94708a6e0ab","id":"","stepType":"then","type":"Website","pre":"So I will be navigated to the website:","mid":"","values":[""]},{"_id":"5d765314aea0c94708a6e0ac","id":"","stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["",""]}];
    let token = '124';
    let repository = 'adessoCucumber/Cucumber';
    service.getStories(repository, token).subscribe(repos => {
      expect(repos.length).toBe(12);
      expect(repos).toEqual(dummySteps)
    });

    const request = httpMock.expectOne(service.apiServer + '/stepDefinitions');
    expect(request.request.method).toBe('GET');
    request.flush(dummyStories);
  });*/


});
