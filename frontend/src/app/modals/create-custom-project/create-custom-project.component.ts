import { Component, ChangeDetectionStrategy, computed, inject, signal, Signal, TemplateRef, viewChild } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NotificationService } from 'src/app/Services/notification.service';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ProjectService } from 'src/app/Services/project.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-create-custom-project',
	templateUrl: './create-custom-project.component.html',
	styleUrls: ['./create-custom-project.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule]
})
export class CreateCustomProjectComponent {
	private modalService = inject(MatDialog);
	projectService = inject(ProjectService);
	private notify = inject(NotificationService);


	readonly createCustomProjectModal = viewChild.required<TemplateRef<unknown>>('createCustomProjectModal');

	modalReference!: MatDialogRef<unknown>;
	/**
  * Existing Projects
  */
	// WHY: a signal, not a snapshot, so a project created while the modal is open is still checked
	private readonly repositories = signal<Signal<RepositoryContainer[] | undefined>>(signal(undefined));

	/** Project name as typed; drives the duplicate check and the Save button state */
	readonly name = signal('');

	/** Whether another existing project already has the typed name */
	readonly nameTaken = computed(() => {
		const name = this.name();
		return name.trim() !== '' && (this.repositories()()?.some(r => r.repoName === name) ?? false);
	});

	// create custom project modal

	/**
     * Open the create custom project modal
     */
	openCreateCustomProjectModal(repositories: Signal<RepositoryContainer[] | undefined>) {
		this.repositories.set(repositories);
		this.name.set('');
		this.modalReference = this.modalService.open(this.createCustomProjectModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
	}

	/**
   * Submits the repository to the backend
   */
	createNewProject(form: NgForm) {
		const title = form.value.title;
		if (!this.isEmptyOrSpaces(title)) 
			this.projectService.createRepository(title).subscribe({
				next: resp => {
					// The id is assigned by the backend; the form has no _id field to read it from
					const id = resp.insertedId;
					const repo: RepositoryContainer = { _id: id, repoName: title, source: 'db' };
					this.notify.info('', 'Project created');
					this.projectService.addRepositoryToCache(repo);
					// Selected right away so the next story is created in this project, not with repo null
					this.projectService.selectRepository(repo);
					this.projectService.createRepositoryEvent({
						repositoryContainer: repo,
						name: title
					});
				},
				error: err => {
					this.notify.error(err?.error?.error || 'Failed to create project', 'Error');
				}
			});
     
		this.modalReference.close();
	}

	/**
   * Keyup message for the project name; the Save button state comes from the template (nameTaken)
   */
	projectUnique() {
		// CASE 1: whitespace-only name counts as empty, so the button stays disabled with the empty-field message
		if (this.name().trim() === '')
			this.notify.error('The field can not be empty');
		else if (this.nameTaken())
			this.notify.error('This Project Title is already in use. Please choose another Title');
	}


	/**
   * Checks if the string is empty or only contains spaces
   * @param str
   * @returns
   */
	isEmptyOrSpaces(str: string) {
		return str === null || str.match(/^ *$/) !== null;
	}

}
