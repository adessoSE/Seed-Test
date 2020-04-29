import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import {LoginFormComponent} from '../login-form/login-form.component';

@Component({
    selector: 'app-account-managment',
    templateUrl: './account-managment.component.html',
    styleUrls: ['./account-managment.component.css']
})
export class AccountManagmentComponent implements OnInit {
    @ViewChild('loginForm') modalService: LoginFormComponent;

    email = null;
    password = null;
    github = null;
    jira = null;

    constructor(public apiService: ApiService, router: Router) {
        router.events.forEach((event) => {
            if (event instanceof NavigationEnd && router.url === '/accountManagment') {
                this.updateSite('Successful');
            }
        });
    }
    login(type) {
        this.modalService.open(type);
    }
    updateSite(report) {
        console.log(report);
        if (report === 'Successful') {
            this.apiService.getUserData().subscribe(user => {
                console.log(user);
                if (typeof user['email'] !== 'undefined') {
                    this.email = user['email'];
                }
                if (typeof user['password'] !== 'undefined') {
                    this.password = user['password'];
                }
                if (typeof user['github'] !== 'undefined') {
                    this.github = user['github'];
                }
                if (typeof user['jira'] !== 'undefined') {
                    this.jira = user['jira'];
                    (document.getElementById('change-jira') as HTMLButtonElement).innerHTML = 'Change Jira-Account';
                }
            });
        }
    }

    ngOnInit() {
    }

}
