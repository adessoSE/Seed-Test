import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseEditorComponent } from './base-editor.component';

describe('BaseEditorComponent', () => {
  let component: BaseEditorComponent;
  let fixture: ComponentFixture<BaseEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
