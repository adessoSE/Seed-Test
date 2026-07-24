import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';

import { ReportComponent } from './report.component';

describe('ReportComponent', () => {
	let _component: ReportComponent;
	let _fixture: ComponentFixture<ReportComponent>;
	let _route: ActivatedRoute;

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
		_route = TestBed.inject(ActivatedRoute);
		//fixture = TestBed.createComponent(ReportComponent);
		//component = fixture.componentInstance;
		//fixture.detectChanges();
	});

	it('should create', () => {
		//expect(component).toBeTruthy();
	});
});
