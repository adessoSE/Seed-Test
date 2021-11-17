import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeJiraAccountComponent } from './change-jira-account.component';

describe('ChangeJiraAccountComponent', () => {
  let component: ChangeJiraAccountComponent;
  let fixture: ComponentFixture<ChangeJiraAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeJiraAccountComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeJiraAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
