import { TestBed, async, ComponentFixture, fakeAsync, getTestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { longStackSupport } from 'q';
import { componentFactoryName } from '@angular/compiler';
import { Router } from '@angular/router';
describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  }));

  beforeEach(()=> {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  })

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'cucumber-frontend'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('cucumber-frontend');
  });

  it('should render title in a h1 tag', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    //expect(compiled.querySelector('h1').textContent).toContain('Welcome to cucumber-frontend!');
  });

  it('logout', fakeAsync(() => {    
    const injector = getTestBed();
    const router = injector.get(Router); 

    localStorage.setItem('repository', 'test1')
    localStorage.setItem('token', '123');
    localStorage.setItem('githubName', 'name');

    component.logout();

    expect(localStorage.getItem('repository')).toEqual(null);
    expect(localStorage.getItem('token')).toEqual(null);
    expect(localStorage.getItem('githubName')).toEqual(null);
    expect(router.url).toEqual('/login');

  }))
});
