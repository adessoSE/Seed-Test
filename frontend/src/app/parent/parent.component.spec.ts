import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ParentComponent } from './parent.component';
import {Story} from '../model/Story'
import { RouterTestingModule } from '@angular/router/testing';
import { ROUTES } from '../routes/routes';
import { ToastrModule } from 'ngx-toastr';
import { Scenario } from '../model/Scenario';
import { Component, EventEmitter, NO_ERRORS_SCHEMA, Output } from '@angular/core';
import {findComponent} from '../../test_helper'
import { ActivatedRoute } from '@angular/router';

const story:Story = {_id: 1, issue_number: 36523, story_id: 37727, storySource: 'github', 
      background: undefined, scenarios: [], oneDriver: true, title: 'test story', body: '',
      state: '', assignee: 'alice', assignee_avatar_url: 'url/to/my/photo', lastTestPassed: false};

const scenario: Scenario = {scenario_id: 3, name: 'my scenario', stepDefinitions: undefined, 
      comment: 'i leave a few words here', lastTestPassed: false, saved: true, daisyAutoLogout: true,
      stepWaitTime: 40, browser: 'chrome'};


describe('ParentComponent', () => {
  let component: ParentComponent;
  let fixture: ComponentFixture<ParentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes(ROUTES), ToastrModule.forRoot()],
      declarations: [ParentComponent],
      providers: [{
        provide: ActivatedRoute,
        useValue: {
          snapshot: {params: {story_id: 45, scenario_id: 4}}
        }
      }],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));
  
  beforeEach(() => {
    fixture = TestBed.createComponent(ParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set selectedScenario proprety', () => {
    jest.spyOn(component, 'setSelectedScenario');
    component.setSelectedScenario(scenario);
    expect(component.setSelectedScenario).toHaveBeenCalled();
    expect(component.selectedScenario).toEqual(scenario);
  });

  it('should set selectedStory property', () => {
    jest.spyOn(component, 'setSelectedStory');
    component.setSelectedStory(story);
    expect(component.setSelectedStory).toHaveBeenCalled();
    expect(component.selectedStory).toEqual(story);
  });

  it ('should render app-report-history', () => {
    component.setEditor();
    fixture.detectChanges();
    const reportHistoryEl = findComponent(fixture, 'app-report-history');
    expect(reportHistoryEl).toBeTruthy();
  });

  it('should call setEditor() on EventEmitter', () => {
    component.isStoryEditorActive = false;
    fixture.detectChanges();
    const reportHistoryEl = findComponent(fixture, 'app-report-history');
    jest.spyOn(component, 'setEditor');
    reportHistoryEl.triggerEventHandler('changeEditor', null);
    fixture.detectChanges();
    expect(component.setEditor).toHaveBeenCalled();
    expect(component.isStoryEditorActive).toBeTruthy();
  });

  it('should update report on event', () => {
    const childStoryBar = findComponent(fixture, 'app-stories-bar');
    jest.spyOn(component, 'viewReport');
    childStoryBar.triggerEventHandler('report', 'Hello, I am the new report');
    fixture.detectChanges();
    expect(component.viewReport).toHaveBeenCalled();
    expect(component.report).toEqual('Hello, I am the new report');
  });

  it('should fail because of the wrong event value', ()=> {
    jest.spyOn(component, 'testRunningGroup');
    component.testRunningGroup(false);
    expect(component.isStoryEditorActive).toEqual(true);
    expect(component.report).toEqual(undefined);
  });


  describe('stories-bar child', (() => {

    it('should listen to changes', () => {
      jest.spyOn(component, 'setSelectedStory');
      const stories_bar = findComponent(fixture, 'app-stories-bar');
      stories_bar.triggerEventHandler('storyChosen', story); 
      expect(component.setSelectedStory).toHaveBeenCalledWith(story);
    });
  
    it('renders stories bar', () => {
      const stories_bar = findComponent(fixture, 'app-stories-bar');
      expect(stories_bar).toBeTruthy();
    });
  
    it('should succeed as isDark expected to be false at beginning', (() => {
      const stories_bar = findComponent(fixture, 'app-stories-bar');
      expect(stories_bar.properties.isDark).toBe(false);
    }));

  }));

  describe('app-story-editor child', (()=> {
    it('render app-story-editor child', (() => {
      const story_editor = findComponent(fixture, 'app-story-editor');
      expect(story_editor).toBeTruthy();
    }));

  }));

  describe('app-report-history child', (()=> {
    it('render app-report-history child', (() => {
      const report_history = findComponent(fixture, 'app-report-history');
      expect(report_history).toBeFalsy();
    }));

  }));

  describe('app-report child', (()=> {
    it('render app-report child', (() => {
      const report = findComponent(fixture, 'app-report');
      expect(report).toBeFalsy();
    }));
  }));
});

