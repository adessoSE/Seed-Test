import { Component, TemplateRef, ChangeDetectionStrategy, inject, viewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Group } from '@seed-test/shared/models/Group';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { Story } from '@seed-test/shared/models/Story';
import { UntypedFormGroup, UntypedFormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoryService } from 'src/app/Services/story.service';
import { NotificationService } from 'src/app/Services/notification.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-create-new-story',
	templateUrl: './create-new-story.component.html',
	styleUrls: ['./create-new-story.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule, ReactiveFormsModule]
})
export class CreateNewStoryComponent {
	private modalService = inject(MatDialog);
	storyService = inject(StoryService);
	private notify = inject(NotificationService);


	readonly createNewStoryModal = viewChild.required<TemplateRef<CreateNewStoryComponent>>('createNewStoryModal');

	/**
     * selectable Stories when create Group
     */
	stories!: Story[];

	filteredStories!: MatTableDataSource<Story>;

	groups!: Group[];

	selectedStories!: string[];

	groupTitle!: string;

	groupId!: string;

	modalReference!: MatDialogRef<unknown>;

	story!: Story;

	//storytitle: string;

	storyForm = new UntypedFormGroup ({
		storyTitle: new UntypedFormControl('',[Validators.required, Validators.pattern(/[\S]/)]),
		storyDescription: new UntypedFormControl('')
	});

	/**
     * Opens the create new story modal
     */
	openCreateNewStoryModal(stories: Story[]) {
		this.stories = stories;
		this.modalReference = this.modalService.open(this.createNewStoryModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
	}

	/**
   * Creates a new custom story
   */
	createNewStory() {
		const _id = localStorage.getItem('id');
		// CASE 1: no project selected — sending the story would post repo null and the backend answers 400.
		// Returns before the form is reset or the modal closed, so the user can pick a project and retry.
		if (_id === null) {
			this.notify.error('Select a project before creating a story');
			return;
		}
		const title = this.storyForm.value.storyTitle;
		if (title.trim() !== '') {
			const description = (this.storyForm.value.storyDescription === '') ? undefined : this.storyForm.value.storyDescription;
			const repoName = localStorage.getItem('repository')!;
			const source = 'db';    
			const repositoryContainer: RepositoryContainer = {repoName, source, _id};
			const story = {title, description};
      
			this.storyService.createCustomStoryEvent({repositoryContainer, story});
		}
		this.storyForm.reset({storyTitle:'', storyDescription:''});
		this.modalReference.close();
	}

	storyUnique() {
		this.storyService.storyUnique('submitCreateNewStory', this.storyForm.value.storyTitle, this.stories, this.story);
	}
	close(modal: MatDialogRef<unknown>){
		this.storyForm.reset({storyTitle:'', storyDescription:''});
		modal.close();
	}
}

