import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ROUTES } from '../routes/routes';
import { RegistrationComponent } from './registration.component';

describe('RegistrationComponent', () => {
	let component: RegistrationComponent;
	let fixture: ComponentFixture<RegistrationComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, RouterTestingModule.withRoutes(ROUTES), MatSnackBarModule],
			declarations: [RegistrationComponent],
			providers: [{
				provide: ActivatedRoute,
				useValue: {
					snapshot: {params: {story_id: 45, scenario_id: 4}}
				}
			}],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	}));
      
	beforeEach(() => {
		fixture = TestBed.createComponent(RegistrationComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});