import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountManagmentComponent } from './account-managment.component';

describe('AccountManagmentComponent', () => {
  let component: AccountManagmentComponent;
  let fixture: ComponentFixture<AccountManagmentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AccountManagmentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountManagmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
