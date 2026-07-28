import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ReportComponent } from './report.component';

describe('ReportComponent', () => {

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, ReportComponent],
			providers: [{
				provide: ActivatedRoute,
				useValue: {
					snapshot: { params: { reportName: '24fkzrw3487943uf358lovd' } }
				}
			}]
		})
			.compileComponents();
	});

	it('should create', () => {
	});
});
