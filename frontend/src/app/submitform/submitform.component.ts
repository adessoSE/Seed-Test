import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-submitform',
    templateUrl: './submitform.component.html',
    styleUrls: ['./submitform.component.css']
})

export class SubmitformComponent {

    @ViewChild('content') content: any;

    constructor(private modalService: NgbModal, public apiService: ApiService) {}

    open(stepType) {
        this.modalService.open(this.content, {ariaLabelledBy: 'modal-basic-title'});
        const id = 'type_form_' + stepType;
        (document.getElementById(id) as HTMLOptionElement).selected = true;
    }


    submit() {
        let title = (document.getElementById('label_form') as HTMLInputElement).value;
        if (title.length === 0) {
            title = (document.getElementById('label_form') as HTMLInputElement).placeholder;
        }
        const type = 'Type: '.concat((document.getElementById('type_form') as HTMLSelectElement).value , '\n');
        const description = 'Description: '.concat((document.getElementById('description_form') as HTMLTextAreaElement).value, '\n');
        const email = 'E-Mail: '.concat((document.getElementById('email_form') as HTMLInputElement).value , '\n');
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

        this.apiService.submitgithub(obj).subscribe((resp) => {
            console.log(resp);
        });

    }

}
