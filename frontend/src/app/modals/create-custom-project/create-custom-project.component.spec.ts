import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationRef, Signal, signal } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { CreateCustomProjectComponent } from './create-custom-project.component';
import { NgForm } from '@angular/forms';
import { ProjectService } from 'src/app/Services/project.service';
import { NotificationService } from 'src/app/Services/notification.service';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';

describe('CreateCustomProjectComponent', () => {
	let component: CreateCustomProjectComponent;
	let fixture: ComponentFixture<CreateCustomProjectComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			// NoopAnimationsModule: MatDialog animates the dialog container, which needs an animations provider in tests
			imports: [HttpClientTestingModule, MatSnackBarModule, NoopAnimationsModule, CreateCustomProjectComponent, LayoutModalComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CreateCustomProjectComponent);
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
	async function openModal(repositories: Signal<RepositoryContainer[] | undefined>): Promise<HTMLButtonElement> {
		component.openCreateCustomProjectModal(repositories);
		fixture.detectChanges();
		await fixture.whenStable();
		return document.querySelector<HTMLButtonElement>('#submitCreateNewProject')!;
	}

	/** Types a name like the browser does: the input event updates the form, then the keyup handler runs */
	async function typeName(value: string) {
		const input = document.querySelector<HTMLInputElement>('#projectTitle')!;
		input.value = value;
		input.dispatchEvent(new Event('input'));
		// No render between the two events: in zoneless mode the render after input runs after keyup, as in the race
		input.dispatchEvent(new KeyboardEvent('keyup', { key: value.slice(-1) }));
		TestBed.inject(ApplicationRef).tick();
		await fixture.whenStable();
	}

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	// Regression: the modal posted the repository, then also re-fetched the list and the app-level handler posted it again
	describe('createNewProject', () => {
		it('posts the repository once and leaves the list refresh to the app', () => {
			const http = TestBed.inject(HttpTestingController);
			const projectService = TestBed.inject(ProjectService);
			const getSpy = vi.spyOn(projectService, 'getRepositoriesEmitter');
			const updateSpy = vi.spyOn(projectService, 'updateRepositoryEmitter');
			component.modalReference = { close: vi.fn() } as unknown as MatDialogRef<unknown>;
			const form = { value: { title: 'Proj', _id: 'a' } } as unknown as NgForm;

			component.createNewProject(form);
			const posts = http.match(req => req.method === 'POST');
			expect(posts.length).toBe(1);
			posts[0].flush({ insertedId: 'new-id' });

			expect(getSpy).not.toHaveBeenCalled();
			expect(updateSpy).not.toHaveBeenCalled();
		});

		// Regression: the form has no _id field, so the created project was never selected and the next story was sent with repo null
		it('selects the created repository using the insertedId from the POST response', () => {
			localStorage.removeItem('id');
			const http = TestBed.inject(HttpTestingController);
			component.modalReference = { close: vi.fn() } as unknown as MatDialogRef<unknown>;

			component.createNewProject({ value: { title: 'Proj' } } as unknown as NgForm);
			http.match(req => req.method === 'POST')[0].flush({ insertedId: 'new-id' });

			expect(localStorage.getItem('id')).toBe('new-id');
			expect(localStorage.getItem('repository')).toBe('Proj');
			expect(localStorage.getItem('source')).toBe('db');
		});
	});

	describe('Save button for the project name', () => {
		// Regression: the keyup handler enabled/disabled the button by DOM write, and the template binding
		// [disabled]="!form.valid" overwrote it on the next change detection when validity had changed
		it('disables Save when the typed name is already in use', async () => {
			const errorSpy = vi.spyOn(TestBed.inject(NotificationService), 'error');
			const repositories = signal<RepositoryContainer[] | undefined>([{ _id: 'a', repoName: 'Proj', source: 'db' }]);
			const save = await openModal(repositories);

			await typeName('Proj');

			expect(save.disabled).toBe(true);
			expect(errorSpy).toHaveBeenCalledWith('This Project Title is already in use. Please choose another Title');
		});

		// Regression: the list was copied when the modal opened, so a project created later was not checked
		it('disables Save when the list gets the typed name after the modal opened', async () => {
			const repositories = signal<RepositoryContainer[] | undefined>([]);
			const save = await openModal(repositories);
			await typeName('Proj');
			expect(save.disabled).toBe(false);

			repositories.set([{ _id: 'a', repoName: 'Proj', source: 'db' }]);
			fixture.detectChanges();
			await fixture.whenStable();

			expect(save.disabled).toBe(true);
		});

		it('keeps Save enabled for a name that is not in use', async () => {
			const repositories = signal<RepositoryContainer[] | undefined>([{ _id: 'a', repoName: 'Other', source: 'db' }]);
			const save = await openModal(repositories);

			await typeName('Proj');

			expect(save.disabled).toBe(false);
		});

		// Regression: a whitespace-only name passed the non-empty check and enabled the submit button
		it('keeps Save disabled and reports an empty field for whitespace-only input', async () => {
			const errorSpy = vi.spyOn(TestBed.inject(NotificationService), 'error');
			const save = await openModal(signal<RepositoryContainer[] | undefined>([]));

			await typeName('   ');

			expect(save.disabled).toBe(true);
			expect(errorSpy).toHaveBeenCalledWith('The field can not be empty');
		});
	});
});
