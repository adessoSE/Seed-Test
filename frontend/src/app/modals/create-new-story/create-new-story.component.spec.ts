import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {HttpClientTestingModule} from '@angular/common/http/testing'

import { CreateNewStoryComponent } from './create-new-story.component';
import { ToastrModule } from 'ngx-toastr';
import { By } from '@angular/platform-browser';

describe('CreateNewStoryComponent', () => {
  let component: CreateNewStoryComponent;
  let fixture: ComponentFixture<CreateNewStoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateNewStoryComponent ],
      imports: [FormsModule, ReactiveFormsModule, HttpClientTestingModule, ToastrModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateNewStoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('story form to be truthy', () => {
    expect(component.storyForm).toBeTruthy();
  });

  it('test group form elemnt count', () => {
    fakeAsync(() => {
      const inputElemnt = fixture.debugElement.queryAll(By.css('#storytitle'));
      expect(inputElemnt.length).toEqual(1);
      const textElement = fixture.debugElement.queryAll(By.css('#storydescription'));
      expect(textElement.length).toEqual(1);
    }); 
  });

  it('check story form values', () => {
    const storyForm = component.storyForm;
    const storyFormValues = {
      storyTitle: '',
      storyDescription: ''
    }
    expect(storyForm.value).toEqual(storyFormValues);
  });

  it('button click should submit the form', () => {
    //expect(component.storyForm.valid).not.toBeTruthy();
    component.storyForm.setValue({storyTitle: 'new stora name', storyDescription: 'a brief story desctiption'} );
    jest.spyOn(component, 'createNewStory');
    //component.createNewStory();
    //expect(component.storyForm.valid).toBeTruthy();
    expect(component.storyForm.get('storyTitle').value).toEqual('new stora name');
    expect(component.storyForm.get('storyDescription').value).toEqual('a brief story desctiption');
  });

  it('check username update', () => {
    fakeAsync(() => {
      const storyTitleElement = fixture.debugElement.query(By.css('#storytitle'));
      storyTitleElement.nativeElement.value = "new title";
      fixture.detectChanges();
      const storyTitle = component.storyForm.get('storyTitle');
      expect(storyTitleElement.nativeElement.value).toEqual(storyTitle.value);
      expect(storyTitle.errors.required).toBeTruthy();
    });
  }); 

  it('check story description update', () => {
    fakeAsync(() => {
      const storyDescriptionElement = fixture.debugElement.query(By.css('#storydescription'));
      storyDescriptionElement.nativeElement.value = 'This is a story description to be displayed on the screen';
      storyDescriptionElement.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      fixture.whenStable().then(() => {
        const storyDescription = component.storyForm.get('storyDescription');
        expect(storyDescriptionElement.nativeElement.value).toEqual(storyDescription.value);
        expect(storyDescription.errors).toBeNull();
      });
    });
  });
});
