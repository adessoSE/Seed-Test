import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import {LoginFormComponent} from '../login-form/login-form.component';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-account-management',
    templateUrl: './account-management.component.html',
    styleUrls: ['./account-management.component.css']
})
export class AccountManagementComponent implements OnInit {
    @ViewChild('loginForm') modalService: LoginFormComponent;

    repositories: RepositoryContainer[];
    email: string;
    password: string;
    github: any;
    jira: any;
    id: string;

    constructor(public apiService: ApiService, public router: Router, private toastr: ToastrService) {
        router.events.forEach((event) => {
            if (event instanceof NavigationEnd && router.url === '/accountManagement') {
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
    
    newRepository() {
        this.modalService.openCreateRepo();
    }

    jiraLogin() {
        this.modalService.open('Jira');
    }
 
     eraseAccount() {
        this.modalService.eraseAccount();
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

    navToRegistration() {
        this.router.navigate(['/register']);
      }

  selectRepository(userRepository: RepositoryContainer) {
    const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
    ref.href = 'https://github.com/' + userRepository.value;
    localStorage.setItem('repository', userRepository.value)
    localStorage.setItem('source', userRepository.source)
    this.router.navigate(['']);
}
}
