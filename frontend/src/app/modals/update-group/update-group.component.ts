import { Component, ChangeDetectionStrategy, computed, inject, viewChild, signal, Signal, TemplateRef } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Group } from '@seed-test/shared/models/Group';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { Story } from '@seed-test/shared/models/Story';
import { GroupService } from 'src/app/Services/group.service';
import { StoryService } from 'src/app/Services/story.service';
import { NotificationService } from 'src/app/Services/notification.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';


@Component({
	selector: 'app-update-group',
	templateUrl: './update-group.component.html',
	styleUrls: ['./update-group.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule, MatIcon, MatSlideToggle, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow]
})
export class UpdateGroupComponent {
	private modalService = inject(MatDialog);
	storyService = inject(StoryService);
	groupService = inject(GroupService);
	notify = inject(NotificationService);


	readonly updateGroupModal = viewChild.required<TemplateRef<UpdateGroupComponent>>('updateGroupModal');
	/**
     * selectable Stories when create Group
  */
	stories!: Story[];

	readonly filteredStories = signal(new MatTableDataSource<Story>());

	/**
   * Existing Groups
   */
	// WHY: a signal, not a snapshot, so a group created while the modal is open is still checked
	private readonly groups = signal<Signal<Group[]>>(signal([]));

	group!: Group;

	scrGroup!: Group;

	/** Group name as typed; drives the duplicate check and the Update button state */
	readonly name = signal('');

	/** Whether another group already has the typed name; the group being edited does not count */
	readonly nameTaken = computed(() => this.groupService.isGroupNameTaken(this.name(), this.groups()(), this.scrGroup));

	selectedStories!: string[];

	groupTitle!: string;

	groupId!: string;

	isSeq!: boolean;

	modalReference!: MatDialogRef<unknown>;

	/**
  * Model Reference for closing
  */
 

	/**
   * Columns of the story table table
   */
	displayedColumnsStories: string[] = ['story', 'checkStory'];

	/**
     * Opens the create new group modal
     */
	openUpdateGroupModal(group: Group, groups: Signal<Group[]>) {
		this.groups.set(groups);
		this.scrGroup = group;
		this.name.set(group.name);
		const repoName = localStorage.getItem('repository') ?? '';
		const _id = localStorage.getItem('id') ?? undefined;
		const source = localStorage.getItem('source') ?? '';
		const repositoryContainer: RepositoryContainer = {repoName, source, _id};
		this.storyService.getStories(repositoryContainer).subscribe({
			next: res => {
				this.stories = res;
				this.filteredStories.set(new MatTableDataSource(res));
			},
			error: () => this.notify.error('Could not load stories')
		});
		this.groupId = group._id!;
		this.groupTitle = group.name;
		this.isSeq = group.isSequential;
		this.selectedStories = [...group.member_stories];
		this.modalReference = this.modalService.open(this.updateGroupModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
	}

	/**
     * Keyup message for the group name; the Update button state comes from the template (nameTaken)
     */
	groupUnique() {
		if (this.name().trim() === '')
			this.notify.error('The field can not be empty');
		else if (this.nameTaken())
			this.notify.error('This Group Title is already in use. Please choose another Title');
	}

	/**
   * Filters stories for searchterm
   */

	searchOnKey(filter: string) {
		const ds = new MatTableDataSource(this.stories);
		ds.filterPredicate =  (data: Story, storyFilter: string) => data.title.trim().toLowerCase().indexOf(storyFilter) != -1;
		/* Apply filter */
		ds.filter = filter.trim().toLowerCase();
		this.filteredStories.set(ds);
	}

	/**
     * Functionality for showing if Story is in Group for Checklist
     * Checks wether the Story is already added
     * @param story
     */
	isStoryChecked(story: Story) {
		if (this.selectedStories === undefined) {
			this.selectedStories = new Array<string>();
			return false;
		}
		const storyId = typeof story._id === 'object' && story._id !== null ? (story._id as { toHexString: () => string }).toHexString() : String(story._id ?? '');
		const exists = this.selectedStories.find((x) => {return x == storyId; });
		return exists !== undefined;
	}

	/**
     * Fuctionality for adding and removing Stories from a Group with a Checklist
     * @param story
     */
	selectStory(story: Story) {
		const storyId = typeof story._id === 'object' && story._id !== null ? (story._id as { toHexString: () => string }).toHexString() : String(story._id ?? '');
		if (this.isStoryChecked(story)) 
			this.selectedStories = this.selectedStories.filter(item => item !== storyId);
		else 
			this.selectedStories.push(storyId);
	}

	deleteGroup(event: Event) {
		event.stopPropagation();
		const repo_id = localStorage.getItem('id') ?? '';
		this.groupService.deleteGroupEvent({'repo_id': repo_id, 'group_id': this.groupId});
	}

	updateGroup(form: NgForm) {
		const repoName = localStorage.getItem('repository') ?? '';
		const _id = localStorage.getItem('id') ?? undefined;
		const source = localStorage.getItem('source') ?? '';
		const repositoryContainer: RepositoryContainer = {repoName, source, _id};
		const group: Group = {_id: this.groupId, name: form.value.title, member_stories: this.selectedStories, isSequential: this.isSeq};
		this.groupService.updateGroupEvent({repositoryContainer, group});
		this.modalReference.close();
	}

}
