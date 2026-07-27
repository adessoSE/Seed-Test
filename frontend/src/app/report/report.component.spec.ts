import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ReportComponent } from './report.component';

describe('ReportComponent', () => {
	let _component: ReportComponent;
	let _fixture: ComponentFixture<ReportComponent>;
	let _route: ActivatedRoute;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
    imports: [HttpClientTestingModule, MatSnackBarModule, ReportComponent],
    providers: [{
            provide: ActivatedRoute,
            useValue: {
                snapshot: { params: { reportName: '24fkzrw3487943uf358lovd' } }
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
