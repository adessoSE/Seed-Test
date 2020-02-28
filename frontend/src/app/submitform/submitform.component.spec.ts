import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitformComponent } from './submitform.component';

describe('SubmitformComponent', () => {
  let component: SubmitformComponent;
  let fixture: ComponentFixture<SubmitformComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubmitformComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmitformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
