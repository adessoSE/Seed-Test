import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewStepRequestComponent } from './new-step-request.component';

describe('NewStepRequestComponent', () => {
  let component: NewStepRequestComponent;
  let fixture: ComponentFixture<NewStepRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewStepRequestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewStepRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
