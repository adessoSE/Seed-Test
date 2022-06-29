import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';
import { ParentComponent } from '../parent/parent.component';

import { TestAccountComponent } from './test-account.component';

describe('TestAccountComponent', () => {
  let component: TestAccountComponent;
  let fixture: ComponentFixture<TestAccountComponent>;
  let route: ActivatedRoute; 

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TestAccountComponent, ParentComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{
        provide: ActivatedRoute,
        useValue: {
          snapshot: {params: {story_id: 45, scenario_id: 4}}
        }
      }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    route = TestBed.inject(ActivatedRoute);
    fixture = TestBed.createComponent(TestAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
