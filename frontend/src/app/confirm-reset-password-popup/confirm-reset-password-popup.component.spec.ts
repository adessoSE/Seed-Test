import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmResetPasswordPopupComponent } from './confirm-reset-password-popup.component';

describe('ConfirmResetPasswordPopupComponent', () => {
  let component: ConfirmResetPasswordPopupComponent;
  let fixture: ComponentFixture<ConfirmResetPasswordPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmResetPasswordPopupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmResetPasswordPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
