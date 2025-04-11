import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ThemingService } from '../Services/theming.service';
import { LoginService } from '../Services/login.service';

/**
 * Component to register a new user
 */
@Component({
    selector: 'app-registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.css'],
    standalone: false
})

export class RegistrationComponent implements OnInit {

    /**
     * Error during user creation
     */
    error: string;

    isDark:boolean;

    /**
     * @ignore
     */
    constructor(public loginService: LoginService, private router: Router, private toastr: ToastrService,
        private themeService:ThemingService) {}

    /**
     * @ignore
     */
    ngOnInit() {
        this.isDark = this.themeService.isDarkMode();
    }

    /**
     * Registers a user to Seed-Test and logs user in
     * @param form user form
     */
    async registerUser(form: NgForm){
        try{
            let userId = localStorage.getItem('userId');
            localStorage.removeItem('userId')
            this.error = undefined;
            let response = await this.loginService.registerUser(form.value.email, form.value.password, userId).toPromise()
            localStorage.setItem('login', 'true');
            this.toastr.success('successfully registered', 'Registration')
            const user = {email: form.value.email, password: form.value.password}
            this.loginService.loginUser(user).subscribe(() => this.router.navigate(['/accountManagement']))
        }  catch(err) {
           
            this.toastr.error('User with this email alredy exist. Please enter another email', 'Email alredy exist')
           
        } 
    }

    isDarkModeOn () {
        this.isDark = this.themeService.isDarkMode();
        return this.isDark
      }
    
}
