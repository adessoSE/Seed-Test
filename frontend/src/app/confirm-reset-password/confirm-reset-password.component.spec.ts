import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ROUTES } from '../routes/routes';
import { ConfirmResetPasswordComponent } from './confirm-reset-password.component';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

describe('ConfirmResetPasswordComponent', () => {
	let component: ConfirmResetPasswordComponent;
	let fixture: ComponentFixture<ConfirmResetPasswordComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
    imports: [HttpClientTestingModule, MatSnackBarModule, FormsModule, ConfirmResetPasswordComponent],
    providers: [provideRouter(ROUTES)],
    schemas: [NO_ERRORS_SCHEMA]
})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ConfirmResetPasswordComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
