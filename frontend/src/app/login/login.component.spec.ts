import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrModule} from 'ngx-toastr';
import { ROUTES } from '../routes/routes';
import { AuthGuard } from '../guards/auth.guard';
import { Router } from '@angular/router';
import {  Location } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {findComponent} from '../../test_helper';
import { By } from '@angular/platform-browser';
import {RepositoryContainer} from '../model/RepositoryContainer';

const repositories: RepositoryContainer[] = [{_id: '1', value: 'myFirstRepo', source: 'db', canEdit: true}]

class MockedApiService {
  authenticated = false;

  isAuthenticated() {
    return this.authenticated
  }
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let location: Location;
  let router: Router;
  let service: MockedApiService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [AuthGuard, MockedApiService],
      imports: [ HttpClientTestingModule, ReactiveFormsModule, FormsModule, RouterTestingModule.withRoutes(ROUTES), ToastrModule.forRoot()],
      declarations: [ LoginComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    service = TestBed.inject(MockedApiService);
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
    router.getCurrentNavigation();
  });

  describe('LoginComponent', ()=> {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should call githubLogin() on click', fakeAsync(()=> {
      jest.spyOn(component, 'githubLogin');
      const gitHubLink = findComponent(fixture, '.githubLoginContainer');
      gitHubLink.nativeElement.click();
      tick();
      fixture.detectChanges();
      expect(component.githubLogin).toHaveBeenCalled();
    }));

    it('should trigger selectRepository() on clicking at repository', fakeAsync(() => {
      jest.spyOn(component, 'selectRepository');
      component.repositories = repositories;
      fixture.detectChanges();
      tick();
      const repoLink = findComponent(fixture, '.repoLink');
      repoLink.nativeElement.click();
      tick();
      fixture.detectChanges();
      //component.selectRepository(repositories[0]);
      expect(component.selectRepository).toHaveBeenCalled();
      //expect(localStorage.getItem('repository')).toEqual(repositories[0].value);
    }));

    it(' onDark() should return true when user-theme set to dark in localStorage', fakeAsync(() => {
      jest.spyOn(component, 'onDark');
      localStorage.setItem('user-theme', 'dark');
      tick();
      component.onDark();
      expect(component.onDark).toBeTruthy();

    }));

    it('should login on input', fakeAsync(()=> {
      
    }));

  });

  describe('login button', (()=> {

    it('should be disabled without form filled', fakeAsync(() => {
      const loginButton = findComponent(fixture, '.normalButton');
      fixture.detectChanges();
      tick();
      expect(loginButton.properties.disabled).toBeTruthy();
    }));

    it('should be enabled with form filled', fakeAsync(()=> {
      const emailInput = findComponent(fixture, '#email');
      const passwordInput = findComponent(fixture, '#password');
      const loginButton = findComponent(fixture, '.normalButton');

      fixture.detectChanges();
      tick();

      emailInput.nativeElement.value = 'alice789876@mybox.de';
      passwordInput.nativeElement.value = '7723vjhakd6732';
      var event = new Event('input');
      emailInput.nativeElement.dispatchEvent(event);
      passwordInput.nativeElement.dispatchEvent(event);

      fixture.detectChanges();
      tick();

      expect(emailInput.nativeElement.value).toBe('alice789876@mybox.de');
      expect(passwordInput.nativeElement.value).toBe('7723vjhakd6732');
      expect(loginButton.properties.disabled).toBeFalsy();
      
    }));

  }));

});
