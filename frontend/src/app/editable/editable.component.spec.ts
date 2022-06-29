import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditableComponent } from './editable.component';
import { EditModeDirective } from '../directives/edit-mode.directive';
import { EditableOnEnterDirective } from '../directives/edit-on-enter.directive';
import { NO_ERRORS_SCHEMA, TemplateRef } from '@angular/core';

/* describe('EditableComponent', () => {
  let component: EditableComponent;
  let fixture: ComponentFixture<EditableComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [],
      declarations: [ EditableComponent],
      providers: [TemplateRef ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); */
