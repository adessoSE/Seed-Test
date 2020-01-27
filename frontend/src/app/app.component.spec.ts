import { TestBed, async, ComponentFixture, fakeAsync, getTestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { longStackSupport } from 'q';
import { componentFactoryName } from '@angular/compiler';
import { Router } from '@angular/router';
describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let storiesForAll = [{story_id:502603476,title:"Gratis Versand",
  body:"Als Premium Kunde erhalte ich freien Versand, wenn ich 5 BÜcher bestelle",
  state:"open",issue_number:66,assignee:"adessoCucumber",
  assignee_avatar_url:"https://avatars0.githubusercontent.com/u/50622173?v=4",
  scenarios:[{scenario_id:1,name:"Premium Kunde 5 Books",
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
  scenarios:[{scenario_id:1,name:"Create Scenario",stepDefinitions:{given:[{id:1,mid:"",
  pre:"I am on the website:",stepType:"given",type:"Website",
  values:["https://cucumber-app.herokuapp.com/login"]}],"when":[{"id":1,"mid":"",
  pre:"I click the button:",stepType:"when",type:"Button",values:["loginTestButton"]},
  {id:2,mid:"",pre:"I click the button:",stepType:"when",type:"Button",values:["repository_0"]},
  {id:3,mid:"",pre:"I click the button:",stepType:"when",type:"Button",values:["story0"]},
  {id:4,mid:"",pre:"I click the button:",stepType:"when",type:"Button",values:["story_add_scenario0"]}],
  then:[{id:1,mid:"",pre:"So I will be navigated to the website:",stepType:"then",
  type:"Website",values:["https://cucumber-app.herokuapp.com/#"]}],example:[]}},
  {scenario_id:2,name:"New Scenario",stepDefinitions:{given:[],when:[],then:[],example:[]}}],
  background:{name:"New Background",stepDefinitions:{when:[]}}}];
  
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  }));

  beforeEach(()=> {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  })

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'cucumber-frontend'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('cucumber-frontend');
  });

  describe('refreshLoginData', function(){

    afterEach(function(){
      localStorage.clear();
    })

    it('should call getRepositories', function(){
      let token = 'token';
      let githubName = 'name';
      let repository = 'repository';

      localStorage.setItem('token', token);
      localStorage.setItem('githubName', githubName);
      localStorage.setItem('repository', repository);

      spyOn(component, 'getRepositories');
      component.refreshLoginData();

      expect(component.getRepositories).toHaveBeenCalled();
      expect(component.token).toBe(token);
      expect(component.githubName).toBe(githubName);
      expect(component.repository).toBe(repository);
    });

    it('should not call getRepositories', function(){
      let token = null;
      let githubName = null;
      let repository = 'repository';

      localStorage.setItem('repository', repository);

      spyOn(component, 'getRepositories');
      component.refreshLoginData();

      expect(component.getRepositories).not.toHaveBeenCalled();
      expect(component.token).toBe(token);
      expect(component.githubName).toBe(githubName);
      expect(component.repository).toBe(repository);
    
    })
  });

  //describe('selectRepository', function(){
  //  it('should select a repository', function(){
  //    let repository = 'Cucumber';
//
  //    spyOn(component.apiService, 'getStories');
//
  //    component.selectRepository(repository);
  //    expect(component.apiService.getStories).toHaveBeenCalled();
  //    expect(component.repository).toBe(repository);
  //    
//
  //  });
  //});

  describe('getRepositories', function(){
    let token = 'undefined';
    let githubName = 'adessoCucumber/Cucumber';

    beforeEach(function(){
      localStorage.setItem('token', token);
      localStorage.setItem('githubName', githubName);
    });

    afterEach(function(){
      localStorage.clear();
    })

    it('should get all repositories', function(){
      spyOn(component.apiService, 'getRepositories');
      component.getRepositories();
      //expect(component.apiService.getRepositories).toHaveBeenCalled();
      expect(component.token).toBe(token);
      expect(component.githubName).toBe(githubName);
    });
  });

  //describe('logout', function(){
  //  beforeEach(function(){
  //    localStorage.setItem('repository', 'test1')
  //    localStorage.setItem('token', '123');
  //    localStorage.setItem('githubName', 'name');
  //  })
//
  //  afterEach(function(){
  //    localStorage.clear();
  //  })
  //  it('logout', fakeAsync(() => {    
  //    const injector = getTestBed();
  //    //const router = injector.get(Router);
  //    const router = component.router;
  //    component.logout();
  //    expect(localStorage.getItem('repository')).toEqual(null);
  //    expect(localStorage.getItem('token')).toEqual(null);
  //    expect(localStorage.getItem('githubName')).toEqual(null);
  //    //expect(router.url).toEqual('/login');
  //  }));
  //});

  
});
