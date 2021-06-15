import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

/**
 * Component to register a new user
 */
@Component({
    selector: 'app-registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.css']
})

export class RegistrationComponent implements OnInit {

    /**
     * Error during user creation
     */
    error: string;

    /**
     * @ignore
     */
    constructor(public apiService: ApiService, private router: Router, private toastr: ToastrService) {}

    /**
     * @ignore
     */
    ngOnInit() {
    }

    /**
     * Registers a user to Seed-Test
     * @param form user form
     */
    async registerUser(form: NgForm){
        let userId = localStorage.getItem('userId');
        localStorage.removeItem('userId')
        this.error = undefined;
        let response = await this.apiService.registerUser(form.value.email, form.value.password, userId).toPromise()
        if (response.error && response.error.status === 'error') {
            this.error = response.error.message;
            //this.toastr.error(response.error.message, 'Registration')
        } else {
            this.toastr.success('successfully registered', 'Registration')
            this.router.navigate(["/"]);
        } 
    }
}
