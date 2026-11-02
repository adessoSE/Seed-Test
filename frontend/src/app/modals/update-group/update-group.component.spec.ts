import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationRef, Signal, signal } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { Group } from '@seed-test/shared/models/Group';
import { UpdateGroupComponent } from './update-group.component';

describe('UpdateGroupComponent', () => {
	let component: UpdateGroupComponent;
	let fixture: ComponentFixture<UpdateGroupComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			// NoopAnimationsModule: MatDialog animates the dialog container, which needs an animations provider in tests
			imports: [HttpClientTestingModule, MatSnackBarModule, NoopAnimationsModule, UpdateGroupComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UpdateGroupComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	// Close the modal while the fixture is still alive, same as the other dialog specs
	afterEach(async () => {
		TestBed.inject(MatDialog).closeAll();
		fixture.detectChanges();
		await fixture.whenStable();
		await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('Update button for the group name', () => {
		const alpha: Group = { _id: 'a', name: 'Alpha', member_stories: [], isSequential: true };
		const beta: Group = { _id: 'b', name: 'Beta', member_stories: [], isSequential: true };

		async function openModal(group: Group, groups: Signal<Group[]>): Promise<HTMLButtonElement> {
			component.openUpdateGroupModal(group, groups);
			fixture.detectChanges();
			await fixture.whenStable();
			return document.querySelector<HTMLButtonElement>('#submitUpdateGroup')!;
		}

		it('keeps Update enabled for the current name of the group being edited', async () => {
			const update = await openModal(alpha, signal([alpha, beta]));

			expect(update.disabled).toBe(false);
		});

		it('disables Update when the new name belongs to another group', async () => {
			const update = await openModal(alpha, signal([alpha, beta]));
			const input = document.querySelector<HTMLInputElement>('#grouptitle')!;
			input.value = 'Beta';
			input.dispatchEvent(new Event('input'));
			input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
			TestBed.inject(ApplicationRef).tick();
			await fixture.whenStable();

			expect(update.disabled).toBe(true);
		});
	});
});
