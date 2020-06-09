import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { NgForm } from '@angular/forms';


@Component({
    selector: 'app-registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.css']
})

export class RegistrationComponent implements OnInit {

    user = {};
    error: string;

    constructor(public apiService: ApiService, private router: Router) {
        
    }

    ngOnInit() {
    }

    async registerUser(form: NgForm){
        console.log(form.value.email, form.value.password);
        this.error = undefined;
        let response = await this.apiService.registerUser(form.value.email, form.value.password).toPromise()
        if (response.status === 'error') {
            this.error = response.message;
        } else {
            this.router.navigate(["/"]);
        } 
    }
}
