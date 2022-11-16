import { Location } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrModule } from 'ngx-toastr';
import { AuthGuard } from '../guards/auth.guard';
import { RegistrationComponent } from '../registration/registration.component';
import { ROUTES } from '../routes/routes';

import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let location: Location;
  let router: Router;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ResetPasswordComponent, RegistrationComponent ],
      imports: [ HttpClientTestingModule, ReactiveFormsModule, FormsModule, RouterTestingModule.withRoutes(ROUTES), ToastrModule.forRoot()]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    router.getCurrentNavigation();
  });

  describe('PasswortComponent', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('redirectToRegister function', (() => {
    it('should route to RegistrationComponent', fakeAsync(() => {
      component.redirectToRegister();
      tick();
      expect(location.path()).toBe('/register');
    })); 
  }));
});
