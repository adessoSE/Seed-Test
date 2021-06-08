import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { ModalsComponent } from "../modals/modals.component";

/**
 * Component to show all account data including the projects of Github, Jira and custom sources
 */
@Component({
    selector: 'app-account-management',
    templateUrl: './account-management.component.html',
    styleUrls: ['./account-management.component.css']
})


export class AccountManagementComponent implements OnInit {
    /**
     * Viewchild to create the modals
     */
    @ViewChild('modalComponent') modalComponent: ModalsComponent;

    /**
     * Repositories or projects of this user
     */
    repositories: RepositoryContainer[];

    /**
     * Email of the user
     */
    email: string;

    /**
     * Github object of the user
     */
    github: any;

    /**
     * Jira object of the user
     */
    jira: any;

    /**
     * User id
     */
    id: string;

    /**
     * Constructor
     * @param apiService Connection to the api service
     * @param router router to handle url changes
     */
    constructor(public apiService: ApiService, public router: Router) {
        router.events.forEach((event) => {
            if (event instanceof NavigationEnd && router.url === '/accountManagement') {
                this.updateSite('Successful');
            }
        });
        this.apiService.getRepositoriesEvent.subscribe((repositories) => {
            this.repositories = repositories;
        });
    }

    /**
     * Loggs in the user to Github
     */
    login() {
        localStorage.setItem('userId', this.id);
        this.apiService.githubLogin();
    }
    
    /**
     * Opens Modal to create a new custom project
     */
    newRepository() {
        this.modalComponent.openCreateCustomProjectModal();
    }

    /**
     * Loggs in the user to Jira
     */
    jiraLogin() {
        this.modalComponent.openChangeJiraAccountModal('Jira');
    }
 
    /**
     * Opens Modal to delete the Seed-Test account
     */
    deleteAccount() {
        this.modalComponent.openDeleteAccountModal(this.email);
    }

    /**
     * Opens Modal to edit the workgroup
     * @param project
     */
    workGroupEdit(project: RepositoryContainer){
        this.modalComponent.openWorkgroupEditModal(project);
    }
    
    /**
     * Fills the Account data
     * @param report 
     */
    updateSite(report: String) {
        if (report === 'Successful') {
            this.apiService.getUserData().subscribe(user => {
                this.id = user._id;
                console.log(user)
                if (typeof user['email'] !== 'undefined') {
                    this.email = user['email'];
                }
                if (typeof user['github'] !== 'undefined') {
                    this.github = user['github'];
                }
                if (typeof user['jira'] !== 'undefined') {
                    this.jira = user['jira'];
                    (document.getElementById('change-jira') as HTMLButtonElement).innerHTML = 'Change Jira-Account';
                }
            });

            this.apiService.getRepositories().subscribe((repositories) => {
                this.repositories = repositories;
            });
        }
    }

   
    /**
     * @ignore
     */
    ngOnInit() {
    }

    /**
     * Removes Github connection from Seed-Test Account
     */
    disconnectGithub() {
        this.apiService.disconnectGithub().subscribe((resp) => {
            window.location.reload();
        });
    }

    /**
     * Redirects user to Register page if the user only used a Github account and now wants to create a Seed-Test account
     */
    navToRegistration() {
        localStorage.setItem('userId', this.id);
        this.router.navigate(['/register']);
    }

    /**
     * Selects the repository and redirects the user to the story editor
     * @param userRepository 
     */
    selectRepository(userRepository: RepositoryContainer) {
        const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
        ref.href = 'https://github.com/' + userRepository.value;
        localStorage.setItem('repository', userRepository.value)
        localStorage.setItem('source', userRepository.source)
        localStorage.setItem('id', userRepository._id)
        this.router.navigate(['']);
    }
}
