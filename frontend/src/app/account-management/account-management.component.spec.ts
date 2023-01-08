import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { findComponent } from '../../test_helper';
import { AccountManagementComponent } from './account-management.component';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { RouterTestingModule } from '@angular/router/testing';
import { ROUTES } from '../routes/routes';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import {  Location } from '@angular/common';
import { Story } from '../model/Story';
import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from "@angular/material/select/testing";

const repositories: RepositoryContainer[] = [{_id: '1', value: 'myFirstRepo', source: 'db', canEdit: true},
{_id: '2', value: 'next repo', source: 'db', canEdit: true},
{_id: '3', value: 'another repo', source: 'db', canEdit: true}]


describe('AccountManagementComponent', () => {
  let component: AccountManagementComponent;
  let fixture: ComponentFixture<AccountManagementComponent>;
  let location: Location;
  let router: Router;
  let loader: HarnessLoader;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AccountManagementComponent],
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
    jest.spyOn(component.apiService, 'isLoggedIn').mockReturnValue(true);
    component.apiService.isLoggedIn();
    component.repositories = repositories;
    component.searchInput = '';
    component.github = '';
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
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

  /* it('should return null as no index in the list', waitForAsync(async ()=> {
    const inputValue =  'myFirstRepo';
    const select = await loader.getHarness(MatSelectHarness);
    jest.spyOn(component,'searchRepos');
    jest.spyOn(component.ngSelect, 'open').mockImplementation(select.open);
    component.searchRepos();
    fixture.whenStable().then(() => {
      expect(component.searchRepos).toHaveBeenCalledTimes(1);
      expect(component.searchRepos).toHaveReturnedWith(inputValue);
    });  
  })); */
});

