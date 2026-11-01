import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { CreateCustomProjectComponent } from './create-custom-project.component';
import { NgForm } from '@angular/forms';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ProjectService } from 'src/app/Services/project.service';
import { NotificationService } from 'src/app/Services/notification.service';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';

describe('CreateCustomProjectComponent', () => {
	let component: CreateCustomProjectComponent;
	let fixture: ComponentFixture<CreateCustomProjectComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, CreateCustomProjectComponent, LayoutModalComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CreateCustomProjectComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

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
			component.modalReference = { close: vi.fn() } as unknown as NgbModalRef;
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
			component.modalReference = { close: vi.fn() } as unknown as NgbModalRef;

			component.createNewProject({ value: { title: 'Proj' } } as unknown as NgForm);
			http.match(req => req.method === 'POST')[0].flush({ insertedId: 'new-id' });

			expect(localStorage.getItem('id')).toBe('new-id');
			expect(localStorage.getItem('repository')).toBe('Proj');
			expect(localStorage.getItem('source')).toBe('db');
		});
	});

	describe('checkProject', () => {
		let button: HTMLButtonElement;

		beforeEach(() => {
			button = document.createElement('button');
			button.id = 'submitCreateNewProject';
			button.disabled = true;
			document.body.appendChild(button);
		});
		afterEach(() => {
			button.remove();
		});

		// Regression: a whitespace-only name passed the non-empty check and enabled the submit button
		it('keeps the button disabled and reports an empty field for whitespace-only input', () => {
			const errorSpy = vi.spyOn(TestBed.inject(NotificationService), 'error');

			component.checkProject('submitCreateNewProject', '   ', []);

			expect(button.disabled).toBe(true);
			expect(errorSpy).toHaveBeenCalledWith('The field can not be empty');
		});

		it('enables the button for a non-blank name that is not in use', () => {
			component.checkProject('submitCreateNewProject', 'Proj', []);

			expect(button.disabled).toBe(false);
		});

		it('keeps the button disabled for a name already in use', () => {
			const existing = [{ _id: 'a', repoName: 'Proj', source: 'db' }] as RepositoryContainer[];

			component.checkProject('submitCreateNewProject', 'Proj', existing);

			expect(button.disabled).toBe(true);
		});
	});
});
