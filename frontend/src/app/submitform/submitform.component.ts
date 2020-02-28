import {Component, Input, OnInit} from '@angular/core';
import {ApiService} from "../Services/api.service";
import {Story} from "../model/Story";

@Component({
    selector: 'app-submitform',
    templateUrl: './submitform.component.html',
    styleUrls: ['./submitform.component.css']
})
export class SubmitformComponent implements OnInit {

    showForm = false;
    form = [""];

    constructor(private apiService: ApiService) {
    }

    ngOnInit() {
    }

    @Input()
    set newform(form) {
        if (form !== undefined){
            this.showForm = true;
            this.form = form;
            console.log("!!!!!!!!!!!!!!!!!!!!");
            console.log(form);
        }

    }

    submit() {
        let title = document.getElementById("label_form").value;
        if(title.length === 0)
            title = document.getElementById("label_form").placeholder;

        let description = document.getElementById("description_form").value;

        let email = document.getElementById("email_form").value;

        let obj = {
            "title": title,
            "body": description,
            "e-mail": email,
            "assignees": [
                "adessoCucumber"
            ],
            "milestone": null,
            "labels": [
                "generated",
                "ToDo"
            ]
        }

        this.apiService.submitgithub(obj).subscribe((resp) => {
            console.log(resp);
        });


    }


}
