import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AfterViewInit, ChangeDetectorRef, Component, NO_ERRORS_SCHEMA, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrModule } from 'ngx-toastr';
import { Story } from 'src/app/model/Story';
import { findComponent } from 'src/test_helper';
import { RenameStoryComponent } from './rename-story.component';


const stories:Story[] = [{_id: 1, issue_number: 36523, story_id: 37727, storySource: 'github', 
      background: undefined, scenarios: [], oneDriver: true, title: 'test story', body: '',
      state: '', assignee: 'alice', assignee_avatar_url: 'url/to/my/photo', lastTestPassed: false}];


@Component({
  template: `
    <div>
    <ng-container *ngTemplateOutlet="modal"> </ng-container>
    </div>
    <app-rename-story> </app-rename-story> 
    `,
})

class WrapperComponent implements AfterViewInit {
  @ViewChild(RenameStoryComponent) renameStoryComponentRef: RenameStoryComponent;

  modal: TemplateRef<any>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.modal = this.renameStoryComponentRef.renameStoryModal;
    this.cdr.detectChanges();
  }
}

describe('RenameStoryComponent', () => {
  let fixture: ComponentFixture<WrapperComponent>;
  let wrapperComponent: WrapperComponent;
   

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RenameStoryComponent, WrapperComponent ],
      imports: [FormsModule, ReactiveFormsModule, HttpClientTestingModule, ToastrModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WrapperComponent);
    wrapperComponent = fixture.debugElement.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(wrapperComponent).toBeDefined();
    expect(wrapperComponent.renameStoryComponentRef).toBeDefined();
  });

  describe('reactive form', ()=> {

    it('should update story title & description', fakeAsync(() => {
      const inputElemnt = findComponent(fixture, '#newStoryTitle');
      let newName = 'updated story name';
      let newDescription = 'an updated brief story desctiption';
      inputElemnt.nativeElement.value = newName;
      inputElemnt.triggerEventHandler('input', null);
      const textElement = findComponent(fixture, '#newStoryDescription');
      textElement.nativeElement.value = newDescription;
      textElement.triggerEventHandler('input', null);
      fixture.detectChanges();
      expect(inputElemnt.nativeElement.value).toEqual(newName);
      expect(textElement.nativeElement.value).toEqual(newDescription);
    })); 

    it('should leave disabled the submit button', fakeAsync(() => {
      const inputElemnt = findComponent(fixture, '#newStoryTitle');
      inputElemnt.nativeElement.value = '';
      inputElemnt.triggerEventHandler('input', null);
      const textElement = findComponent(fixture, '#newStoryDescription');
      textElement.nativeElement.value = 'an updated brief story desctiption';
      textElement.triggerEventHandler('input', null);
      fixture.detectChanges();
      const submitbutton = findComponent(fixture, '.normalButton');
      expect(submitbutton.nativeElement.disabled).toBeTruthy();
    }));

  });
});
