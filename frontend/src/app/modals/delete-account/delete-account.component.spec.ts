import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NgForm } from '@angular/forms';
import { throwError } from 'rxjs';
import { NotificationService } from '../../Services/notification.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { DeleteAccountComponent } from './delete-account.component';

describe('DeleteAccountComponent', () => {
	let component: DeleteAccountComponent;
	let fixture: ComponentFixture<DeleteAccountComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, DeleteAccountComponent, LayoutModalComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DeleteAccountComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('error handling', () => {
		it('shows an error toast when the account cannot be deleted', () => {
			const notify = TestBed.inject(NotificationService);
			const error = vi.spyOn(notify, 'error');
			component.email = 'user@example.com';
			component.modalReference = { close: vi.fn() } as never;
			vi.spyOn(component.managmentService, 'deleteUser').mockReturnValue(throwError(() => new Error('server error')));
			const form = { value: { insertedEmail: 'user@example.com' } } as unknown as NgForm;

			component.deleteAccount(form);

			expect(error).toHaveBeenCalledWith('Could not delete account');
		});
	});
});
