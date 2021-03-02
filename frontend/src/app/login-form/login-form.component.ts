import {Component, EventEmitter, Output, ViewChild} from '@angular/core';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {ApiService} from '../Services/api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-login-form',
    templateUrl: './login-form.component.html',
    styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent {
    @Output()
    mongoUpdate: EventEmitter<any> = new EventEmitter();

    @ViewChild('content') content: any;
    @ViewChild('content2') content2: any;
    @ViewChild('content3') content3: any;
    @ViewChild('content4') content4: any;
    type: string;
    email: string;
    userId;

    constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) {
    }

    open(type) {
        this.modalService.open(this.content, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
        this.type = type;
        document.getElementById('modalHeader').innerHTML = `Login to ${type}`;
    }

    openCreateRepoModal() {
        this.modalService.open(this.content2, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
    }

    eraseAccountModal(email) {
        this.email = email;
        this.modalService.open(this.content4, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
    }

    eraseAccount(){
        let insertedEmail = (document.getElementById('insertedEmail') as HTMLInputElement).value;
        if (insertedEmail == this.email){
            this.apiService.deleteUser().subscribe(resp => {
                this.toastr.info('', 'User Deleted')
                this.apiService.logoutEvent.emit()
            });
        }else{
            this.modalService.open(this.content4, {ariaLabelledBy: 'modal-basic-title', size: 'sm' });
        }
    }

    submitRepo(){
        const name = (document.getElementById('repo_name') as HTMLInputElement).value;
        if (!this.isEmptyOrSpaces(name)){
            this.apiService.createRepository(name).subscribe(resp => {
                console.log(resp);
                this.toastr.info('', 'Repository created')
                this.apiService.getRepositories().subscribe(res => {
                })
            });
        }
    }

    isEmptyOrSpaces(str: string){
        return str === null || str.match(/^ *$/) !== null;
    }


    submit() {
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
        } else {

        }
    }
}
