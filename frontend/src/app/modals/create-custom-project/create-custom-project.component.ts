import { Component, ChangeDetectionStrategy, inject, TemplateRef, viewChild } from '@angular/core';
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
	repositories!: RepositoryContainer[];

	repoId!: string;

	repository!: RepositoryContainer;

	// create custom project modal

	/**
     * Open the create custom project modal
     */
	openCreateCustomProjectModal(repositories: RepositoryContainer[]) {
		this.repositories = repositories;
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
	projectUnique(form: NgForm){
		this.checkProject('submitCreateNewProject', form.value.title, this.repositories, this.repository);

	}

	checkProject(buttonId: string, input: string, array: RepositoryContainer[], repository?: RepositoryContainer){
		array = array ? array : [];
		// CASE 1: whitespace-only name counts as empty, so the button stays disabled with the empty-field message
		input = input && input.trim() ? input : '';
		const button = (document.getElementById(buttonId)) as HTMLButtonElement;
		if ((input && !array.find(i => i.repoName === input)) || (repository ? array.find(g => g._id == repository._id && g.repoName == input) : false))
			button.disabled = false;
   
  
		else 
			if (input.length == 0) {
				button.disabled = true;
				this.notify.error('The field can not be empty');
			} else {
				button.disabled = true;
				this.notify.error('This Project Title is already in use. Please choose another Title'); 
			}
  
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
