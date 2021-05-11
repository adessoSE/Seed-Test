import {Component, EventEmitter, Output, ViewChild} from '@angular/core';
import { NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {ApiService} from '../Services/api.service';
import { ToastrService } from 'ngx-toastr';
import { Block } from '../model/Block';
import { StepType } from '../model/StepType';
import { NgForm } from '@angular/forms';
import { RepositoryContainer } from '../model/RepositoryContainer';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
  styleUrls: ['./modals.component.css']
})
export class ModalsComponent{
  @Output()
  mongoUpdate: EventEmitter<any> = new EventEmitter();

  
  @ViewChild('changeJiraAccountModal') changeJiraAccountModal: any;
  @ViewChild('createCustomProjectModal') createCustomProjectModal: any;
  @ViewChild('deleteAccountModal') deleteAccountModal: any;
  @ViewChild('addBlockFormModal') addBlockFormModal: any;
  @ViewChild('saveBlockFormModal') saveBlockFormModal: any;
  @ViewChild('newStepRequestModal') newStepRequestModal: any;
  @ViewChild('renameScenarioModal') renameScenarioModal: any;
  @ViewChild('workgroupEditModal') workgroupEditModal: any;
  @ViewChild('createNewStoryModal') createNewStoryModal: any;


  //change Jira account modal
  type: string;

  // delete account modal
  email: string;

  
  // add block form modal
  blocks: Block[];
  stepList: any;
  selectedBlockList: Block[]; 
  selectedBlock: Block;
  displayedColumns: string[] = ['stepType', 'pre'];
  correspondingComponent: string;
  clipboardBlock: Block;

  // save Block form modal
  block: Block;
  displayedColumnsSaveBlock: string[] = ['stepType', 'pre'];
  stepListSaveBlock = [];
  exampleBlock = false;
  exampleChecked = false;
  stepListComplete = [];
  parentComponent;
  
  // workgroup modal
  displayedColumnsWorkgroup: string[] = ['email' , 'can_edit_workgroup'];
  workgroupList = []
  workgroupOwner = ''
  workgroupError = '';
  workgroupProject: RepositoryContainer;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) {
  }

  // change Jira Account modal
  openChangeJiraAccountModal(type) {
      this.modalService.open(this.changeJiraAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
      this.type = type;
  }

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
            this.mongoUpdate.emit(response);
        });
    }
  }

  // create custom project modal
  openCreateCustomProjectModal() {
      this.modalService.open(this.createCustomProjectModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
  }

  submitRepo(){
    const name = (document.getElementById('repo_name') as HTMLInputElement).value;
    if (!this.isEmptyOrSpaces(name)){
        this.apiService.createRepository(name).subscribe(resp => {
            this.toastr.info('', 'Project created')
            this.apiService.getRepositories().subscribe(res => {
              //
            })
        });
    }
  }

  isEmptyOrSpaces(str: string){
    return str === null || str.match(/^ *$/) !== null;
  }

  // delete Account Modal
  openDeleteAccountModal(email) {
      this.email = email;
      this.modalService.open(this.deleteAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
  }

  eraseAccount(){
      let insertedEmail = (document.getElementById('insertedEmail') as HTMLInputElement).value;
      if (insertedEmail == this.email){
          this.apiService.deleteUser().subscribe(resp => {
              this.toastr.info('', 'User Deleted')
              this.apiService.logoutEvent.emit()
          });
      }else{
          this.modalService.open(this.deleteAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
      }
  }


  // add block form modal
  
  openAddBlockFormModal(correspondingComponent, repoId) {
    this.getAllBlocks(repoId)
    this.correspondingComponent = correspondingComponent;
    this.modalService.open(this.addBlockFormModal, {ariaLabelledBy: 'modal-basic-title'});
    this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock'))
  }

  getAllBlocks(repoId){
    this.apiService.getBlocks(repoId).subscribe((resp) => {
      this.blocks = resp
    });
  }

  change(event){
    this.selectedBlock = this.selectedBlockList[0]
    this.selectedBlockList = []

    this.stepList = []
    Object.keys(this.selectedBlock.stepDefinitions).forEach((key, index) => {
      this.selectedBlock.stepDefinitions[key].forEach((step: StepType) => {
        this.stepList.push(step)
      })
    })
  }

  copiedBlock() {
    if (this.clipboardBlock){
      this.apiService.addBlockToScenario(this.clipboardBlock, this.correspondingComponent)
    }
  }

  addBlockFormSubmit() {
    this.apiService.addBlockToScenario(this.selectedBlock, this.correspondingComponent)
  }

  deleteBlock(event, rowIndex: number, block: Block) {
    event.stopPropagation();
    this.apiService.deleteBlock(block._id).subscribe(resp => {
      this.blocks.splice(rowIndex, 1)
      this.stepList = []
      this.selectedBlock = null
    })
  }


  //save block form modal
  openSaveBlockFormModal(block: Block, comp) {
    this.exampleBlock = false;
    this.exampleChecked = false;
    this.block = block;
    this.parentComponent = comp;
    if(block.stepDefinitions.example && block.stepDefinitions.example.length > 0){
      this.exampleBlock = true;
    }
    this.createStepList()
    this.modalService.open(this.saveBlockFormModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  createStepList(){
    this.stepListSaveBlock = []
    Object.keys(this.block.stepDefinitions).forEach((key, index) => {
      this.block.stepDefinitions[key].forEach((step: StepType) => {
        this.stepListSaveBlock.push(step)
      })
    })
  }

  exampleCheck(event){
    this.exampleChecked = !this.exampleChecked;
    if(this.exampleChecked){
      this.stepListComplete = JSON.parse(JSON.stringify(this.stepListSaveBlock))
      this.stepListSaveBlock = this.stepListSaveBlock.filter(step => {
        return step.stepType == "example";
      })
    }else {
      this.stepListSaveBlock = JSON.parse(JSON.stringify(this.stepListComplete))
    }
  }

  submitSaveBlock() {
      if(this.exampleBlock){
        this.parentComponent.checkAllExampleSteps(null, false)
      }else {
        this.parentComponent.checkAllSteps(null, false)
      }
      let title = (document.getElementById('blockNameInput') as HTMLInputElement).value;
      if (title.length === 0) {
          title = (document.getElementById('blockNameInput') as HTMLInputElement).placeholder;
      }
      this.block.name = title
      this.block.repository = localStorage.getItem('repository');
      this.block.source = localStorage.getItem('source');
      this.block.repositoryId = localStorage.getItem('id');
      this.apiService.saveBlock(this.block).subscribe((resp) => {
          console.log(resp);
      });
  }

  // new step request modal

  openNewStepRequestModal(stepType) {
    this.modalService.open(this.newStepRequestModal, {ariaLabelledBy: 'modal-basic-title'});
    const id = 'type_form_' + stepType;
    (document.getElementById(id) as HTMLOptionElement).selected = true;
  }


  submitNewStepRequest(form: NgForm) {
      let title = (document.getElementById('label_form') as HTMLInputElement).value;
      if (title.length === 0) {
          title = (document.getElementById('label_form') as HTMLInputElement).placeholder;
      }
      const type = 'Type: '.concat((document.getElementById('type_form') as HTMLSelectElement).value , '\n');
      let description = 'Description: '.concat(form.value.description_form, '\n')
      let email = 'Email: '.concat(form.value.email, '\n')
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

  openRenameScenarioModal(oldTitle) {
    this.modalService.open(this.renameScenarioModal, {ariaLabelledBy: 'modal-basic-title'});
    let name = document.getElementById('newTitle') as HTMLInputElement
    name.placeholder = oldTitle
  }

  submitRenameScenario() {
    let name = (document.getElementById('newTitle') as HTMLInputElement).value ;
    this.apiService.renameScenarioEmit(name)
  }

  // workgroup Edit Modal
  openWorkgroupEditModal(project: RepositoryContainer) {
    this.workgroupList = []
    this.workgroupProject = project
    this.modalService.open(this.workgroupEditModal, {ariaLabelledBy: 'modal-basic-title'});
    let header = document.getElementById('workgroupHeader') as HTMLSpanElement
    header.textContent = 'Project: ' + project.value

    this.apiService.getWorkgroup(this.workgroupProject._id).subscribe(res => {
      this.workgroupList = res.member
      this.workgroupOwner = res.owner.email
    })
  }

  workgroupInvite(form: NgForm) {
    let email = form.value.email;
    let canEdit = form.value.canEdit
    if (!canEdit) canEdit = false;
    let user = {email, canEdit}
    this.workgroupError = ''
    this.apiService.addToWorkgroup(this.workgroupProject._id, user).subscribe(res => {
      let originList = JSON.parse(JSON.stringify(this.workgroupList))
      originList.push(user)
      this.workgroupList = []
      this.workgroupList = originList
    }, (error) => {
      this.workgroupError = error.error.error
    })
  }

  removeFromWorkgroup(user){
    this.apiService.removeFromWorkgroup(this.workgroupProject._id, user).subscribe(res => {
      this.workgroupList = res.member
    })
  }

  checkEditUser(event, user){
    user.canEdit = !user.canEdit
    this.apiService.updateWorkgroupUser(this.workgroupProject._id, user).subscribe(res => {
      this.workgroupList = res.member
    })
  }


  // createNewStoryModal

  openCreateNewStoryModal() {
    this.modalService.open(this.createNewStoryModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
  }

  createNewStory() {
    const title = (document.getElementById('storytitle') as HTMLInputElement).value;
    const description = (document.getElementById('storydescription') as HTMLInputElement).value;
    const value = localStorage.getItem('repository');
    const _id = localStorage.getItem('id')
    const source = 'db';
    const repositoryContainer: RepositoryContainer = {value, source, _id};
    let story = {title, description}
    this.apiService.createCustomStoryEmitter.emit({repositoryContainer, story})

  }
    
}
