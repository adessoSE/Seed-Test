import {Component, OnInit} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Router} from '@angular/router';
import {NgForm} from '@angular/forms';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    repositories: string[];
    jirakeys: string[];
    error: string;
    private testAccountName = 'adessoCucumber';
    private testAccountToken: string;
    private testJiraHost = '';

    constructor(public apiService: ApiService,
                public router: Router) {
    }

    ngOnInit() {
    }

    login(form: NgForm) {
        this.error = undefined;
        this.apiService.getRepositories(form.value.token, form.value.githubName).subscribe((resp) => {
            this.repositories = resp;
            localStorage.setItem('token', form.value.token);
            localStorage.setItem('githubName', form.value.githubName);
            localStorage.setItem('githubCount', `${this.repositories.length}`);
        }, (err) => {
            this.error = err.error;
        });
    }

    loginTestAccount() {
        this.error = undefined;
        let tmp_repositories = [];
        this.apiService.getRepositories(this.testAccountToken, this.testAccountName).subscribe((resp) => {
            tmp_repositories = resp;
            localStorage.setItem('token', this.testAccountToken);
            localStorage.setItem('githubName', this.testAccountName);
            localStorage.setItem('githubCount', `${tmp_repositories.length}`);
            if (this.testJiraHost.length > 0) {
                this.apiService.getProjectsFromJira(this.testJiraHost).subscribe((resp2) => {
                    this.repositories = tmp_repositories.concat(this.filterProjects(resp2));
                    localStorage.setItem('jiraHost', this.testJiraHost);
                }, (err) => {
                    this.error = err.error;
                    this.repositories = tmp_repositories;
                });
            } else {
                this.repositories = tmp_repositories;
            }
        }, (err) => {
            this.error = err.error;
        });
    }

    filterProjects(resp) {
        let projectNames = [];
        let projectKeys = [];
        JSON.parse(resp)['projects'].forEach(entry => {
            projectNames = projectNames.concat(`${localStorage.getItem('jiraHost')}/${entry['name']}`);
            projectKeys = projectKeys.concat(`${entry['key']}`);
        });
        this.jirakeys = projectKeys;
        console.log(this.jirakeys);
        return projectNames;
    }

    selectRepository(userRepository: string) {
        const index = this.repositories.findIndex(name => name === userRepository) - Number(localStorage.getItem('githubCount'));
        if (index < 0) {
            localStorage.setItem('repositoryType', 'github');
        } else {
            localStorage.setItem('repositoryType', 'jira');
            localStorage.setItem('jiraKey', this.jirakeys[index]);
        }
        localStorage.setItem('repository', userRepository);
        this.router.navigate(['/']);
    }

    navToRegistration() {
    this.router.navigate(['/register']);
  }
}
