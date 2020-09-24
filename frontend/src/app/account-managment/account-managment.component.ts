import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import {LoginFormComponent} from '../login-form/login-form.component';
import { RepositoryContainer } from '../model/RepositoryContainer';

@Component({
    selector: 'app-account-managment',
    templateUrl: './account-managment.component.html',
    styleUrls: ['./account-managment.component.css']
})
export class AccountManagmentComponent implements OnInit {
    @ViewChild('loginForm') modalService: LoginFormComponent;

    repositories: RepositoryContainer[];
    email: string;
    password: string;
    github: any;
    jira: any;
    id: string;
    router: any;

    constructor(public apiService: ApiService, router: Router) {
        router.events.forEach((event) => {
            if (event instanceof NavigationEnd && router.url === '/accountManagment') {
                this.updateSite('Successful');
            }
        });
        this.apiService.getRepositoriesEvent.subscribe((repositories) => {
            this.repositories = repositories;
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
        if (!this.isEmptyOrSpaces(name)){
            this.apiService.createRepository(name).subscribe(resp => {
                console.log(resp);
                this.apiService.getRepositories().subscribe(res => {
                })
            });
        }
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

    isEmptyOrSpaces(str: string){
        return str === null || str.match(/^ *$/) !== null;
    }

    
  selectRepository(userRepository: RepositoryContainer) {
    const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
    ref.href = 'https://github.com/' + userRepository.value;
    localStorage.setItem('repository', userRepository.value)
    localStorage.setItem('source', userRepository.source)
    if(this.router.url !== '/'){
      this.router.navigate(['']);
    } else {
      this.apiService.getStories(userRepository).subscribe((resp) => {
      });
    }
  }
}
