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

    email: string;
    password: string;
    github: any;
    jira: any;
    id: string;

    constructor(public apiService: ApiService, router: Router) {
        router.events.forEach((event) => {
            if (event instanceof NavigationEnd && router.url === '/accountManagment') {
                this.updateSite('Successful');
            }
        });
    }
    login() {
        if (this.email) {
            localStorage.setItem('userId', this.id);
            this.apiService.githubLogin();
        }
    }
    createRepo() {
        const name = (document.getElementById('repo_name') as HTMLInputElement).value;
        const email = (document.getElementById('email_field') as HTMLInputElement).value;
        this.apiService.createRepository(email, name).subscribe(resp => {
            console.log(resp);
        });
    }

    jiraLogin() {
        this.modalService.open('Jira');
    }
    updateSite(report) {
        console.log(report);
        if (report === 'Successful') {
            this.apiService.getUserData().subscribe(user => {
                console.log(user);
                this.id = user._id;
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

    disconnectGithub() {
        this.apiService.disconnectGithub().subscribe((resp) => {
            window.location.reload();
        });
    }
}
