import { async, ComponentFixture, TestBed, getTestBed, fakeAsync } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormsModule, NgForm} from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment'
import { tick } from '@angular/core/src/render3';
import { of } from 'rxjs';
import { tokenName } from '@angular/compiler';

const testAccountName = 'adessoCucumber';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, HttpClientTestingModule, RouterTestingModule],
      declarations: [ LoginComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set localStorage item Repository', fakeAsync(() => {
    const testRepo = 'TestRepo';
    const injector = getTestBed();
    const router = injector.get(Router);
    component.selectRepository(testRepo)

    expect(localStorage.getItem('repository')).toBe(testRepo);
    expect(router.url).toEqual('/');
  }));

  describe('loginTestAccount', () => {

    it('should set items for token and githubName', () => {
      const repositories = ['adessoAG/Seed-Test','adessoCucumber/Cucumber','adessoCucumber/TestRepo'];
      const token = 'undefined';
      spyOn(component.apiService, 'getRepositories').and.returnValue(of(repositories));
      component.loginTestAccount();
      expect(localStorage.getItem('githubName')).toBe(testAccountName);
      expect(localStorage.getItem('token')).toBe(token);
      expect(component.error == undefined).toBeTruthy();
      expect(component.apiService.getRepositories).toHaveBeenCalled();
      expect(component.repositories).toBe(repositories);
    });
  });

  describe('login', () => {

    it('should set items for token and githubName', () => {
      const repositories = ['adessoAG/Seed-Test', 'adessoCucumber/Cucumber', 'adessoCucumber/TestRepo'];
      const token = 'undefined';
      spyOn(component.apiService, 'getRepositories').and.returnValue(of(repositories));
      const form = new NgForm(null, null);
      form.value.token = token;
      form.value.githubName = testAccountName;

      component.login(form);
      expect(localStorage.getItem('githubName')).toBe(testAccountName);
      expect(localStorage.getItem('token')).toBe(token);
      expect(component.error == undefined).toBeTruthy();
      expect(component.apiService.getRepositories).toHaveBeenCalled();
      expect(component.repositories).toBe(repositories);
    });
  });

});
