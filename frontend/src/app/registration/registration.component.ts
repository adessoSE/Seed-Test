import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { NgForm, FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';

@Component({
    selector: 'app-registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.css']
})

export class RegistrationComponent implements OnInit {
    loginForm: FormGroup;
    error: string;

    
  error_messages = {
    'email': [
      { type: 'required', message: 'Email is required.' },
      { type: 'minlength', message: 'Email length.' },
      { type: 'maxlength', message: 'Email length.' },
      { type: 'required', message: 'Please enter a valid email address.' }
    ],

    'password': [
      { type: 'required', message: 'Password is required.' },
      { type: 'minlength', message: 'Password length.' },
      { type: 'maxlength', message: 'Password length.' }
    ],
    'confirmpassword': [
      { type: 'required', message: 'Password is required.' },
      { type: 'minlength', message: 'Password length.' },
      { type: 'maxlength', message: 'Password length.' }
    ],
  }

    constructor(public apiService: ApiService, private router: Router, public formBuilder: FormBuilder) {
        this.loginForm = this.formBuilder.group({
            email: new FormControl('', Validators.compose([
              Validators.required,
              Validators.minLength(6),
              Validators.maxLength(30)
            ])),
            password: new FormControl('', Validators.compose([
              Validators.required,
              Validators.minLength(6),
              Validators.maxLength(30)
            ])),
            confirmpassword: new FormControl('', Validators.compose([
              Validators.required,
              Validators.minLength(6),
              Validators.maxLength(30)
            ])),
          }, { 
            validators: this.password.bind(this)
          });
    }

    ngOnInit() {
    }

    
  password(formGroup: FormGroup) {
    const { value: password } = formGroup.get('password');
    const { value: confirmPassword } = formGroup.get('confirmpassword');
    return password === confirmPassword ? null : { passwordNotMatch: true };
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
