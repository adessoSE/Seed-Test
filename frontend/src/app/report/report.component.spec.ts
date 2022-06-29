import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';

import { ReportComponent } from './report.component';

describe('ReportComponent', () => {
  let component: ReportComponent;
  let fixture: ComponentFixture<ReportComponent>;
  let route: ActivatedRoute; 

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ReportComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()],
      providers: [{
        provide: ActivatedRoute,
        useValue: {
          snapshot: {params: {reportName: '24fkzrw3487943uf358lovd'}}
        }
      }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    route = TestBed.inject(ActivatedRoute);
    fixture = TestBed.createComponent(ReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

 /*  it('should create', () => {
    expect(component).toBeTruthy();
  }); */
});
