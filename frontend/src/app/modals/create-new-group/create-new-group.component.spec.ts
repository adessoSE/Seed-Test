import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Signal, signal } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { Group } from '@seed-test/shared/models/Group';
import { NotificationService } from 'src/app/Services/notification.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { CreateNewGroupComponent } from './create-new-group.component';

describe('CreateNewGroupComponent', () => {
	let component: CreateNewGroupComponent;
	let fixture: ComponentFixture<CreateNewGroupComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			// NoopAnimationsModule: MatDialog animates the dialog container, which needs an animations provider in tests
			imports: [HttpClientTestingModule, MatSnackBarModule, NoopAnimationsModule, CreateNewGroupComponent, LayoutModalComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CreateNewGroupComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	// Close the modal while the fixture is still alive. Dismissing after TestBed teardown removes DOM nodes of an
	// already destroyed view, which surfaced as unhandled "removeChild of null" errors.
	afterEach(async () => {
		TestBed.inject(MatDialog).closeAll();
		fixture.detectChanges();
		await fixture.whenStable();
		// MatDialog removes the dialog container only after its close animation, which whenStable() does not wait for
		await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
	});

	/**
	 * Opens the modal through its public method. MatDialog renders the content into document.body, so the
	 * Save button is read from the document.
	 */
	async function openModal(groups: Signal<Group[]>): Promise<HTMLButtonElement> {
		component.openCreateNewGroupModal(groups);
		fixture.detectChanges();
		await fixture.whenStable();
		return document.querySelector<HTMLButtonElement>('#submitCreateNewGroup')!;
	}

	/** Types a name like the browser does: the input event updates the form, then the keyup handler runs */
	async function typeName(value: string) {
		const input = document.querySelector<HTMLInputElement>('#grouptitle')!;
		input.value = value;
		input.dispatchEvent(new Event('input'));
		input.dispatchEvent(new KeyboardEvent('keyup', { key: value.slice(-1) }));
		fixture.detectChanges();
		await fixture.whenStable();
	}

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('Save button for the group name', () => {
		// Regression: the keyup handler enabled/disabled the button by DOM write, and the template binding
		// [disabled]="!form.valid" overwrote it on the next change detection when validity had changed
		it('disables Save when the typed name is already in use', async () => {
			const errorSpy = vi.spyOn(TestBed.inject(NotificationService), 'error');
			const groups = signal<Group[]>([{ _id: 'g1', name: 'Smoke', member_stories: [], isSequential: true }]);
			const save = await openModal(groups);

			await typeName('Smoke');

			expect(save.disabled).toBe(true);
			expect(errorSpy).toHaveBeenCalledWith('This Group Title is already in use. Please choose another Title');
		});

		// Regression: the list was copied when the modal opened, so a group created later was not checked
		it('disables Save when the list gets the typed name after the modal opened', async () => {
			const groups = signal<Group[]>([]);
			const save = await openModal(groups);
			await typeName('Smoke');
			expect(save.disabled).toBe(false);

			groups.set([{ _id: 'g1', name: 'Smoke', member_stories: [], isSequential: true }]);
			fixture.detectChanges();
			await fixture.whenStable();

			expect(save.disabled).toBe(true);
		});

		it('keeps Save enabled for a name that is not in use', async () => {
			const groups = signal<Group[]>([{ _id: 'g1', name: 'Other', member_stories: [], isSequential: true }]);
			const save = await openModal(groups);

			await typeName('Smoke');

			expect(save.disabled).toBe(false);
		});

		// Regression: a whitespace-only name passed the non-empty check and enabled the submit button
		it('keeps Save disabled and reports an empty field for whitespace-only input', async () => {
			const errorSpy = vi.spyOn(TestBed.inject(NotificationService), 'error');
			const save = await openModal(signal<Group[]>([]));

			await typeName('   ');

			expect(save.disabled).toBe(true);
			expect(errorSpy).toHaveBeenCalledWith('The field can not be empty');
		});
	});
});
