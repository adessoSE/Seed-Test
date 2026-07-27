import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ROUTES } from '../routes/routes';
import { RegistrationComponent } from './registration.component';

describe('RegistrationComponent', () => {
	let component: RegistrationComponent;
	let fixture: ComponentFixture<RegistrationComponent>;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, MatSnackBarModule, RegistrationComponent],
			providers: [provideRouter(ROUTES), {
				provide: ActivatedRoute,
				useValue: {
					snapshot: { params: { story_id: 45, scenario_id: 4 } }
				}
			}],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});
      
	beforeEach(() => {
		fixture = TestBed.createComponent(RegistrationComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});