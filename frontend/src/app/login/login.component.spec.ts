import { async, ComponentFixture, TestBed, getTestBed, fakeAsync } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormsModule} from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment'
import { tick } from '@angular/core/src/render3';

const testAccountName = 'adessoCucumber';
const testAccountToken = environment.TESTACCOUNT_TOKEN;

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
    let testRepo = 'TestRepo';
    const injector = getTestBed();
    const router = injector.get(Router); 
    component.selectRepository(testRepo)
    
    expect(localStorage.getItem('repository')).toBe(testRepo);
    expect(router.url).toEqual('/');
  }));

  describe('Async functions', () => {
    beforeEach(() => {
      jasmine.clock().install();
  });
  
  afterEach(() => {
      jasmine.clock().uninstall();
  });

    it('login test account', () => {
      component.loginTestAccount();
      expect(localStorage.getItem('token')).toBe(testAccountToken);
      expect(localStorage.getItem('githubName')).toBe(testAccountName);
      expect(component.error == undefined).toBeTruthy();
    });
  });

});
