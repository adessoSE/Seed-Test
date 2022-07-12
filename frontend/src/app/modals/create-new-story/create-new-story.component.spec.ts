import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {HttpClientTestingModule} from '@angular/common/http/testing'
import {findComponent} from '../../../test_helper'
import { CreateNewStoryComponent } from './create-new-story.component';
import { ToastrModule } from 'ngx-toastr';
import { By } from '@angular/platform-browser';
import { Story } from 'src/app/model/Story';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'src/app/Services/api.service';
import { AfterViewInit, ChangeDetectorRef, Component, TemplateRef, ViewChild } from '@angular/core';

const stories:Story[] = [{_id: 1, issue_number: 36523, story_id: 37727, storySource: 'github', 
      background: undefined, scenarios: [], oneDriver: true, title: 'test story', body: '',
      state: '', assignee: 'alice', assignee_avatar_url: 'url/to/my/photo', lastTestPassed: false}];


@Component({
  template: `
    <div>
    <ng-container *ngTemplateOutlet="modal"> </ng-container>
    </div>
    <app-create-new-story> </app-create-new-story> 
    `,
})

class WrapperComponent implements AfterViewInit {
  @ViewChild(CreateNewStoryComponent) storyComponentRef: CreateNewStoryComponent;

  modal: TemplateRef<any>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.modal = this.storyComponentRef.createNewStoryModal;
    this.cdr.detectChanges();
  }
}

describe('CreateNewStoryComponent', () => {
  let fixture: ComponentFixture<WrapperComponent>;
  let wrapperComponent: WrapperComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateNewStoryComponent, WrapperComponent ],
      imports: [FormsModule, ReactiveFormsModule, HttpClientTestingModule, ToastrModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WrapperComponent);
    wrapperComponent = fixture.debugElement.componentInstance;
    fixture.detectChanges();
  });

  it('create the app', fakeAsync(() => {
    expect(wrapperComponent).toBeDefined();
    expect(wrapperComponent.storyComponentRef).toBeDefined();
}));

  it('story form to be truthy & invalid', fakeAsync (() => {
    const form = findComponent(fixture,'#storyForm');
    expect(wrapperComponent.storyComponentRef.storyForm).toBeTruthy();
    expect(wrapperComponent.storyComponentRef.storyForm.valid).toBeFalsy();
  }));

  it('test group form elemnt count', fakeAsync(() => {
    const inputElemnt = fixture.debugElement.queryAll(By.css('#storytitle'));
    const textElement = fixture.debugElement.queryAll(By.css('#storydescription'));
    expect(inputElemnt.length).toEqual(1);
    expect(textElement.length).toEqual(1); 
  }));

  it('should leave disabled the submit button', fakeAsync(() => {
    const submitbutton = findComponent(fixture, '.normalButton');
    expect(submitbutton.nativeElement.disabled).toBeTruthy();
  }));

 /*  it('should enable button on form filled', fakeAsync(() => {
    const inputElemnt = findComponent(fixture, '#storytitle');
    const textElement = findComponent(fixture, '#storydescription');  
    inputElemnt.nativeElement.value = 'new story name';
    inputElemnt.triggerEventHandler('input', null);
    textElement.nativeElement.value = 'a brief story desctiption';
    textElement.triggerEventHandler('input', null);
    const submitbutton = findComponent(fixture, '.normalButton');
    //wrapperComponent.storyComponentRef.createNewStory();
    //fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(wrapperComponent.storyComponentRef.storyForm.valid).toBeTruthy();
      expect(submitbutton.nativeElement.disabled).toBeFalsy();
    });
   
  })); */

  it('should define title & description', fakeAsync(() => {
    const inputElemnt = findComponent(fixture, '#storytitle');
    inputElemnt.nativeElement.value = 'new story name';
    inputElemnt.triggerEventHandler('input', null);
    const textElement = findComponent(fixture, '#storydescription');
    textElement.nativeElement.value = 'a brief story desctiption';
    textElement.triggerEventHandler('input', null);
    fixture.detectChanges();
    expect(inputElemnt.nativeElement.value).toEqual('new story name');
    expect(textElement.nativeElement.value).toEqual('a brief story desctiption');
  })); 
});
