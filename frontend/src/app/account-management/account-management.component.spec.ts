import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { findComponent } from 'src/test_helper';
import { AccountManagementComponent } from './account-management.component';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { RouterTestingModule } from '@angular/router/testing';
import { ROUTES } from '../routes/routes';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import {  Location } from '@angular/common';

const repositories: RepositoryContainer[] = [{_id: '1', value: 'myFirstRepo', source: 'db', canEdit: true}]

describe('AccountManagementComponent', () => {
  let component: AccountManagementComponent;
  let fixture: ComponentFixture<AccountManagementComponent>;
  let location: Location;
  let router: Router;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AccountManagementComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot(), RouterTestingModule.withRoutes(ROUTES)],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(AccountManagementComponent);
    component = fixture.componentInstance;
    component.repositories = repositories;
    fixture.detectChanges();
    router.getCurrentNavigation();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call login() on click', fakeAsync(()=> {
    jest.spyOn(component, 'login');
    const gitHubLink = findComponent(fixture, '.githubLoginContainer');
    gitHubLink.nativeElement.click();
    tick();
    expect(component.login).toHaveBeenCalled();
  }));

  it('should return null as no index in the list', ()=> {
    jest.spyOn(component,'searchRepos');
    component.searchInput = '';
    fixture.detectChanges();
    component.searchRepos();
    expect(component.searchRepos).toHaveBeenCalled();
  });
});
