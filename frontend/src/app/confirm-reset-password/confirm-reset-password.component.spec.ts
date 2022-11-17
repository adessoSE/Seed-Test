import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { ROUTES } from '../routes/routes';
import { Router } from '@angular/router';
import {  Location } from '@angular/common';
import { ConfirmResetPasswordComponent } from './confirm-reset-password.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

describe('ConfirmResetPasswordComponent', () => {
  let component: ConfirmResetPasswordComponent;
  let fixture: ComponentFixture<ConfirmResetPasswordComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfirmResetPasswordComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot(), FormsModule, RouterTestingModule.withRoutes(ROUTES)],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
