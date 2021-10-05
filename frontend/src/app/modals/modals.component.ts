import {Component, EventEmitter, Output, ViewChild} from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {ApiService} from '../Services/api.service';
import {ToastrService} from 'ngx-toastr';
import {Block} from '../model/Block';
import {StepType} from '../model/StepType';
import {NgForm} from '@angular/forms';
import {RepositoryContainer} from '../model/RepositoryContainer';
import {Story} from '../model/Story';
import {Group} from '../model/Group';
import { DeleteRepositoryToast } from '../deleteRepository-toast';

/**
 * Component of all Modals
 */
@Component({
    selector: 'app-modals',
    templateUrl: './modals.component.html',
    styleUrls: ['./modals.component.css']
})
export class ModalsComponent {

    /**
     * Emits a response after the jira account got created
     */
    @Output()
    jiraAccountResponse: EventEmitter<any> = new EventEmitter();

    /**
     * View childs of all the several modals
     */
    @ViewChild('changeJiraAccountModal') changeJiraAccountModal: any;
    @ViewChild('createCustomProjectModal') createCustomProjectModal: any;
    @ViewChild('deleteAccountModal') deleteAccountModal: any;
    @ViewChild('addBlockFormModal') addBlockFormModal: any;
    @ViewChild('saveBlockFormModal') saveBlockFormModal: any;
    @ViewChild('newStepRequestModal') newStepRequestModal: any;
    @ViewChild('renameScenarioModal') renameScenarioModal: any;
    @ViewChild('renameStoryModal') renameStoryModal: any;
    @ViewChild('workgroupEditModal') workgroupEditModal: any;
    @ViewChild('createNewStoryModal') createNewStoryModal: any;
    @ViewChild('createNewGroupModal') createNewGroupModal: any;
    @ViewChild('updateGroupModal') updateGroupModal: any;

    /**
     * Type of the changed account
     * Modal: change Jira account modal
     */
    type: string;

    /**
     * Email of the user
     * Modal: delete account modal
     */
    email: string;

    /**
     * Modal: add block form modal
     */

    /**
     * Saved blocks
     */
    blocks: Block[];

    /**
     * Steps of the current block
     */
    stepList: any;

    /**
     * Current selected block list
     */
    selectedBlockList: Block[];

    /**
     * Currently selected block
     */
    selectedBlock: Block;

    /**
     * Columns of the select block table
     */
    displayedColumns: string[] = ['stepType', 'pre'];

    /**
     * Background or Scenario, depending from where the block was saved
     */
    correspondingComponent: string;

    /**
     * Block which is saved to the clipboard
     */
    clipboardBlock: Block;


    /**
     * Modal: save Block form modal
     */

    /**
     * Block to be saved
     */
    block: Block;

    /**
     * Columns of the save block table
     */
    displayedColumnsSaveBlock: string[] = ['stepType', 'pre'];

    /**
     * List with the steps to be saved to the block
     */
    stepListSaveBlock = [];

    /**
     * If the block is an example
     */
    exampleBlock = false;

    /**
     * If an example is checked
     */
    exampleChecked = false;

    /**
     * All Steps
     */
    stepListComplete = [];

    /**
     * Parent component
     */
    parentComponent;


    /**
     * Modal: workgroup modal
     */

    /**
     * Columns of the workgroup table
     */
    displayedColumnsWorkgroup: string[] = ['email', 'can_edit_workgroup'];

    /**
     * List of all members in the workgroup
     */
    workgroupList = [];

    /**
     * Owner of the workgroup
     */
    workgroupOwner = '';

    /**
     * Error if the request was not successful
     */
    workgroupError = '';

    /**
     * Repository container of the workgroup
     */
    workgroupProject: RepositoryContainer;

    /**
     * Email and id of the active user
     */
    userEmail = '';
    userId = '';

    /**
     * Model Reference for closing
     */
    modalReference: NgbModalRef;


    /**
     * selectable Stories when create Group
     */
    stories: Story[];

    /**
     * Existing Groups
     */
    groups: Group[];

    scrGroup: Group;

    selectedStories: string[];

    groupTitle: string;

    groupId: string;


    /**
     * ngModal for Create Story
     */
    storyTitle: string;

    storyDescription: string;



    /**
     * @ignore
     */
    constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) {}

    ngOnInit(){
        this.apiService.deleteRepositoryEvent.subscribe(() => {
            this.deleteCustomRepo();
          });
    }

    ngOnDestroy(){
        this.apiService.deleteRepositoryEvent.unsubscribe();
    }

    // change Jira Account modal

    /**
     * Opens the change Jira Account Modal
     * @param type type of the changed account
     */
    openChangeJiraAccountModal(type) {
        this.modalService.open(this.changeJiraAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
        this.type = type;
    }

    /**
     * Create or change Jira Account
     */
    changeJiraAccountSubmit() {
        if (this.type === 'Jira') {
            const jiraAccountName = (document.getElementById('jiraAccountName') as HTMLInputElement).value;
            const jira_password = (document.getElementById('jira_password') as HTMLInputElement).value;
            const jiraHost = (document.getElementById('jiraHost') as HTMLInputElement).value;
            const request = {
                'jiraAccountName': jiraAccountName,
                'jiraPassword': jira_password,
                'jiraHost': jiraHost,
            };
            this.apiService.createJiraAccount(request).subscribe(response => {
                this.jiraAccountResponse.emit(response);
            });
        }
    }

    // create custom project modal

    /**
     * Open the create custom project modal
     */
    openCreateCustomProjectModal() {
        this.modalService.open(this.createCustomProjectModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
    }

    /**
     * Submits the repository to the backend
     */
    submitRepo() {
        const name = (document.getElementById('repo_name') as HTMLInputElement).value;
        if (!this.isEmptyOrSpaces(name)) {
            this.apiService.createRepository(name).subscribe(resp => {
                this.toastr.info('', 'Project created');
                this.apiService.updateRepositoryEmitter();
            });
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

    // delete Account Modal

    /**
     * Opens delete account modal
     * @param email email of the user
     */
    openDeleteAccountModal(email) {
        this.email = email;
        this.modalService.open(this.deleteAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
    }

    /**
     * Deletes The Seed-Test account
     */
    deleteAccount() {
        const insertedEmail = (document.getElementById('insertedEmail') as HTMLInputElement).value;
        if (insertedEmail == this.email) {
            this.apiService.deleteUser().subscribe(resp => {
                this.toastr.info('', 'User Deleted');
                this.apiService.logoutEvent.emit();
            });
        } else {
            this.modalService.open(this.deleteAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
        }
    }


    // add block form modal

    /**
     * Opens the add block form modal
     * @param correspondingComponent is either background or scenario
     * @param repoId id of the current repository / project
     */
    openAddBlockFormModal(correspondingComponent: string, repoId: string) {
        this.getAllBlocks(repoId);
        this.correspondingComponent = correspondingComponent;
        this.modalService.open(this.addBlockFormModal, {ariaLabelledBy: 'modal-basic-title'});
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock'));
    }

    /**
     * Get all blocks from the backend
     * @param repoId id of the repository / project
     */
    getAllBlocks(repoId: string) {
        this.apiService.getBlocks(repoId).subscribe((resp) => {
            this.blocks = resp;
        });
    }

    /**
     * Changes block selection and updates the shown step list
     * @param event
     */
    changeBlockSelection(event) {
        this.selectedBlock = this.selectedBlockList[0];
        this.selectedBlockList = [];

        this.stepList = [];
        Object.keys(this.selectedBlock.stepDefinitions).forEach((key, index) => {
            this.selectedBlock.stepDefinitions[key].forEach((step: StepType) => {
                this.stepList.push(step);
            });
        });
    }

    /**
     * Copies a block from the clipboard to the scenario
     */
    copiedBlock() {
        if (this.clipboardBlock) {
            this.apiService.addBlockToScenario(this.clipboardBlock, this.correspondingComponent);
        }
    }

    /**
     * Adds a block to saved blocks
     */
    addBlockFormSubmit() {
        this.apiService.addBlockToScenario(this.selectedBlock, this.correspondingComponent);
    }

    /**
     * Deletes a block from the saved blocks
     * @param event click event
     * @param rowIndex index of the deleted block
     * @param block block to be deleted
     */
    deleteBlock(event, rowIndex: number, block: Block) {
        event.stopPropagation();
        this.apiService.deleteBlock(block._id).subscribe(resp => {
            this.blocks.splice(rowIndex, 1);
            this.stepList = [];
            this.selectedBlock = null;
        });
    }


    // save block form modal

    /**
     * Opens save block form modal
     * @param block
     * @param comp
     */
    openSaveBlockFormModal(block: Block, comp) {
        this.exampleBlock = false;
        this.exampleChecked = false;
        this.block = block;
        this.parentComponent = comp;
        if (block.stepDefinitions.example && block.stepDefinitions.example.length > 0) {
            this.exampleBlock = true;
        }
        this.createStepList();
        this.modalService.open(this.saveBlockFormModal, {ariaLabelledBy: 'modal-basic-title'});
    }

    /**
     * Creates a new step list
     */
    createStepList() {
        this.stepListSaveBlock = [];
        Object.keys(this.block.stepDefinitions).forEach((key, index) => {
            this.block.stepDefinitions[key].forEach((step: StepType) => {
                this.stepListSaveBlock.push(step);
            });
        });
    }

    /**
     * Checks if an example is contained in the step list
     * @param event
     */
    exampleCheck(event) {
        this.exampleChecked = !this.exampleChecked;
        if (this.exampleChecked) {
            this.stepListComplete = JSON.parse(JSON.stringify(this.stepListSaveBlock));
            this.stepListSaveBlock = this.stepListSaveBlock.filter(step => {
                return step.stepType == 'example';
            });
        } else {
            this.stepListSaveBlock = JSON.parse(JSON.stringify(this.stepListComplete));
        }
    }

    /**
     * Submits and saves a block
     */
    submitSaveBlock() {
        if (this.exampleBlock) {
            this.parentComponent.checkAllExampleSteps(null, false);
        } else {
            this.parentComponent.checkAllSteps(null, false);
        }
        let title = (document.getElementById('blockNameInput') as HTMLInputElement).value;
        if (title.length === 0) {
            title = (document.getElementById('blockNameInput') as HTMLInputElement).placeholder;
        }
        this.block.name = title;
        this.block.repository = localStorage.getItem('repository');
        this.block.source = localStorage.getItem('source');
        this.block.repositoryId = localStorage.getItem('id');
        this.apiService.saveBlock(this.block).subscribe((resp) => {
            console.log(resp);
        });
    }


    // new step request modal

    /**
     * Opens a new step request modal
     * @param stepType
     */
    openNewStepRequestModal(stepType) {
        this.modalService.open(this.newStepRequestModal, {ariaLabelledBy: 'modal-basic-title'});
        const id = 'type_form_' + stepType;
        (document.getElementById(id) as HTMLOptionElement).selected = true;
    }

    /**
     * Submits a request to create a new step
     * @param form
     */
    submitNewStepRequest(form: NgForm) {
        let title = (document.getElementById('label_form') as HTMLInputElement).value;
        if (title.length === 0) {
            title = (document.getElementById('label_form') as HTMLInputElement).placeholder;
        }
        const type = 'Type: '.concat((document.getElementById('type_form') as HTMLSelectElement).value, '\n');
        const description = 'Description: '.concat(form.value.description_form, '\n');
        const email = 'Email: '.concat(form.value.email, '\n');
        const body = type.concat(description, email);
        const obj = {
            'title': title,
            'body': body,
            'assignees': [
                'adessoCucumber'
            ],
            'milestone': null,
            'labels': [
                'generated',
                'ToDo'
            ]
        };
        this.apiService.submitGithub(obj).subscribe((resp) => {
            console.log(resp);
        });

    }

    // rename Scenario

/**
 * Opens the rename scenario Modal
 * @param oldTitle old scenario title
 */
openRenameScenarioModal(oldTitle: string) {
    this.modalService.open(this.renameScenarioModal, {ariaLabelledBy: 'modal-basic-title'});
    const name = document.getElementById('newTitle') as HTMLInputElement;
    name.placeholder = oldTitle;
}

/**
 * Submits the new name for the scenario
 */
submitRenameScenario() {
    const name = (document.getElementById('newTitle') as HTMLInputElement).value;
    this.apiService.renameScenarioEmit(name);
}


// rename Story

  /**
   * Opens the rename story Modal
   * @param oldTitle old story title
   */
   openRenameStoryModal(oldTitle: string) {
    this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    const title = document.getElementById('newStoryTitle') as HTMLInputElement;
    title.placeholder = oldTitle;
  }

  /**
   * Submits the new name for the story
   */
  submitRenameStory() {
    const title = (document.getElementById('newStoryTitle') as HTMLInputElement).value ;
    this.apiService.renameStoryEmit(title);
  }

  // workgroup Edit Modal
    /**
     * Opens the workgroup edit modal
     */
    openWorkgroupEditModal(project: RepositoryContainer, userEmail, userId) {
        this.userEmail = userEmail;
        this.userId = userId;
        this.workgroupList = [];
        this.workgroupProject = project;
        this.modalReference = this.modalService.open(this.workgroupEditModal, {ariaLabelledBy: 'modal-basic-title'});
        const header = document.getElementById('workgroupHeader') as HTMLSpanElement;
        header.textContent = 'Project: ' + project.value;

        this.apiService.getWorkgroup(this.workgroupProject._id).subscribe(res => {
            this.workgroupList = res.member;
            this.workgroupOwner = res.owner.email;
        });
    }

    /**
     * Invites a user to the workgroup
     * @param form
     */
    workgroupInvite(form: NgForm) {
        const email = form.value.email;
        let canEdit = form.value.canEdit;
        if (!canEdit) { canEdit = false; }
        const user = {email, canEdit};
        this.workgroupError = '';
        this.apiService.addToWorkgroup(this.workgroupProject._id, user).subscribe(res => {
            const originList = JSON.parse(JSON.stringify(this.workgroupList));
            originList.push(user);
            this.workgroupList = [];
            this.workgroupList = originList;
        }, (error) => {
            this.workgroupError = error.error.error;
        });
    }

    /**
     * Removes a user from the workgroup
     * @param user
     */
    removeFromWorkgroup(user) {
        this.apiService.removeFromWorkgroup(this.workgroupProject._id, user).subscribe(res => {
            this.workgroupList = res.member;
        });
    }

    /**
     * Checks if the user can edit the workgroup
     * @param event
     * @param user
     */
    checkEditUser(event, user) {
        user.canEdit = !user.canEdit;
        this.apiService.updateWorkgroupUser(this.workgroupProject._id, user).subscribe(res => {
            this.workgroupList = res.member;
        });
    }

    /**
     * Delete a custom repository
     */
     deleteCustomRepo(){
        if(this.userEmail == this.workgroupOwner) {
            this.apiService.deleteRepository(this.workgroupProject, this.userId).subscribe(res =>{
                this.apiService.updateRepositoryEmitter();
                this.modalReference.close();
            })
        }
    }

    /**
     * Opens the delete repository toast
     */
    showDeleteRepositoryToast() {
        this.toastr.warning('', 'Do you really want to delete this repository?', {
            toastComponent: DeleteRepositoryToast
        });
    }


    // createNewStoryModal

    /**
     * Opens the create new story modal
     */
    openCreateNewStoryModal() {
        this.modalService.open(this.createNewStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    }

    /**
     * Creates a new custom story
     */
    createNewStory(event) {
        event.stopPropagation();
        const title = this.storyTitle; //(document.getElementById('storytitle') as HTMLInputElement).value;
        const description = this.storyDescription; //(document.getElementById('storydescription') as HTMLInputElement).value;
        this.storyTitle = null;
        this.storyDescription = null;
        const value = localStorage.getItem('repository');
        const _id = localStorage.getItem('id');
        const source = 'db';
        const repositoryContainer: RepositoryContainer = {value, source, _id};
        const story = {title, description};
        this.apiService.createCustomStoryEvent({repositoryContainer, story});
    }

    // createNewStoryModal

    /**
     * Opens the create new group modal
     */
    openCreateNewGroupModal(groups: Group[]) {
        this.groups = groups;
        this.groupId = undefined;
        this.groupTitle = '';
        this.selectedStories = undefined;
        const value = localStorage.getItem('repository');
        const _id = localStorage.getItem('id');
        const source = localStorage.getItem('source');
        const repositoryContainer: RepositoryContainer = {value, source, _id};
        this.apiService.getStories(repositoryContainer).subscribe(res => {
            this.stories = res;
        });
        this.modalService.open(this.createNewGroupModal, {ariaLabelledBy: 'modal-basic-title'});
    }

    /**
     * Creates a new custom story
     */
    createNewGroup(event) {
        event.stopPropagation();
        const title = this.groupTitle;
        const member_stories = this.selectedStories;
        const value = localStorage.getItem('repository');
        const _id = localStorage.getItem('id');
        const source = localStorage.getItem('source');
        const repositoryContainer: RepositoryContainer = {value, source, _id};
        const group = {title, member_stories};
        this.apiService.createGroupEvent({repositoryContainer, group});
    }

    /**
     * Opens the create new group modal
     */
    openUpdateGroupModal(group: Group, groups: Group[]) {
        this.groups = groups;
        this.scrGroup = group;
        const value = localStorage.getItem('repository');
        const _id = localStorage.getItem('id');
        const source = localStorage.getItem('source');
        const repositoryContainer: RepositoryContainer = {value, source, _id};
        this.apiService.getStories(repositoryContainer).subscribe(res => {
            this.stories = res;
        });
        this.groupId = group._id;
        this.groupTitle = group.name;
        this.selectedStories = [];
        for (const s of group.member_stories) {
            this.selectedStories.push(s._id);
        }
        this.modalService.open(this.updateGroupModal, {ariaLabelledBy: 'modal-basic-title'});
    }

    updateGroup($event) {
        console.log('selectedStories:', this.selectedStories);
        event.stopPropagation();
        const value = localStorage.getItem('repository');
        const _id = localStorage.getItem('id');
        const source = localStorage.getItem('source');
        const repositoryContainer: RepositoryContainer = {value, source, _id};
        const group: Group = {_id: this.groupId, name: this.groupTitle, member_stories: this.selectedStories};
        this.apiService.updateGroupEvent({repositoryContainer, group});
    }

    deleteGroup($event) {
        event.stopPropagation();
        const repo_id = localStorage.getItem('id');
        this.apiService.deleteGroupEvent({'repo_id': repo_id, 'group_id': this.groupId});
    }

    groupUnique(event, input: String, array: Group[], group?: Group) {
        array = array ? array : [];
        input = input ? input : '';

        const button = (group ? document.getElementById('groupUpdate') : document.getElementById('groupSave')) as HTMLButtonElement;
        if ((input && !array.find(i => i.name == input)) || (group ? array.find(g => g._id == group._id && g.name == input) : false)) {
            button.disabled = false;
        } else {
            button.disabled = true;
            this.toastr.error('Choose another Group-name');
        }
    }

    /**
     * Fuctionality for adding and removing Stories from a Group with a Checklist
     * @param story
     */
    selectStory(story) {
        if (this.isStoryChecked(story)) {
            this.selectedStories = this.selectedStories.filter(item => item !== story._id);
        } else {
            this.selectedStories.push(story._id);
        }
    }

    /**
     * Functionality for showing if Story is in Group for Checklist
     * Checks wether the Story is already added
     * @param story
     */
    isStoryChecked(story) {
        if (this.selectedStories === undefined) {
            this.selectedStories = new Array<string>();
            return false;
        }
        const exists = this.selectedStories.find(function(x) {return x == story._id; });
        return exists !== undefined;
    }
}
