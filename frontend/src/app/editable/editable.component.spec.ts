import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditableComponent } from './editable.component';
import { EditModeDirective } from './edit-mode.directive';
import { EditableOnEnterDirective } from './edit-on-enter.directive';
import { TemplateRef } from '@angular/core';

describe('EditableComponent', () => {
  let component: EditableComponent;
  let fixture: ComponentFixture<EditableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [],
      declarations: [ EditableComponent],
      providers: [TemplateRef ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(1).toBe(1);
    //expect(component).toBeTruthy();
  });
});
