import { Component, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService } from 'src/app/Services/notification.service';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { ProjectService } from 'src/app/Services/project.service';

@Component({
	selector: 'app-create-custom-project',
	templateUrl: './create-custom-project.component.html',
	styleUrls: ['./create-custom-project.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class CreateCustomProjectComponent {
	private modalService = inject(NgbModal);
	projectService = inject(ProjectService);
	private notify = inject(NotificationService);


	@ViewChild('createCustomProjectModal') createCustomProjectModal!: CreateCustomProjectComponent;

	modalReference!: NgbModalRef;
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
		this.modalReference = this.modalService.open(this.createCustomProjectModal, {ariaLabelledBy: 'modal-basic-title'});
	}

	/**
   * Submits the repository to the backend
   */
	createNewProject(form: NgForm) {
		const title = form.value.title;
		const id = form.value._id;
		if (!this.isEmptyOrSpaces(title)) 
			this.projectService.createRepository(title, id).subscribe(_resp => {
				this.notify.info('', 'Project created');
				this.projectService.getRepositoriesEmitter();
				this.projectService.updateRepositoryEmitter();
			});
    
		this.modalReference.close();
	}
	projectUnique(form: NgForm){
		this.checkProject('submitCreateNewProject', form.value.title, this.repositories, this.repository);

	}

	checkProject(buttonId: string, input: string, array: RepositoryContainer[], repository?: RepositoryContainer){
		array = array ? array : [];
		input = input ? input : '';
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
