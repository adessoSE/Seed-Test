import {Component, EventEmitter, Output, ViewChild} from '@angular/core';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {ApiService} from '../Services/api.service';

@Component({
    selector: 'app-login-form',
    templateUrl: './login-form.component.html',
    styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent {
    @Output()
    mongoUpdate: EventEmitter<any> = new EventEmitter();

    @ViewChild('content') content: any;
    type: string;

    constructor(private modalService: NgbModal, public apiService: ApiService) {
    }

    open(type) {
        this.modalService.open(this.content, {ariaLabelledBy: 'modal-basic-title'});
        this.type = type;
        document.getElementById('modalHeader').innerHTML = `Login to ${type}`;
    }


    submit() {
        if (this.type === 'Jira') {
            const jiraAccountName = (document.getElementById('jiraAccountName') as HTMLInputElement).value;
            const jiraPassword = (document.getElementById('jiraPassword') as HTMLInputElement).value;
            const jiraHost = (document.getElementById('jiraHost') as HTMLInputElement).value;
            const request = {
                'jiraAccountName': jiraAccountName,
                'jiraPassword': jiraPassword,
                'jiraHost': jiraHost,
            };
            this.apiService.createJiraAccount(request).subscribe(response => {
                this.mongoUpdate.emit(response);
            });
        } else {

        }
    }
}
