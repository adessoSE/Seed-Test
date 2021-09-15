import {Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { ModalsComponent } from "../modals/modals.component";
import {Subscription} from "rxjs/internal/Subscription";
import { saveAs } from 'file-saver';
import { ThemingService } from '../Services/theming.service';

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

    routeSub: Subscription

    searchInput: string;

    searchList: RepositoryContainer[];

    downloadRepoID: string;

    isDark : boolean;

    /**
     * Constructor
     * @param apiService Connection to the api service
     * @param router router to handle url changes
     */
    constructor(public apiService: ApiService, public router: Router, public themeService : ThemingService) {
        /*window.addEventListener("storage", (event) => {
            console.log('storage listener')
            if (event.storageArea == window.sessionStorage && event.key == 'repositories') {
                console.log('sessionStorage')
                try {
                    this.repositories = JSON.parse(event.newValue);
                } catch (e) {
                    console.log("could'nt interpret: ", event.newValue)
                }
            }
        },false);*/
        this.routeSub = router.events.subscribe(event => {
            if (event instanceof NavigationEnd && router.url === '/accountManagement') {
                this.updateSite('Successful'); //
            }
        });
        if (!router.events) {
            this.apiService.getRepositoriesEvent.subscribe((repositories) => {
                this.seperateRepos(repositories);
                console.log('first load');
            });
        }
    }

    seperateRepos(repos) {
        /*const dbRepos = []
        const githubRepos = []
        const jiraRepos = []
        for (const repo of repos) {
            switch (repo.source) {
                case 'db':
                    dbRepos.push(repo);
                    break;
                case 'github':
                    githubRepos.push(repo);
                    break;
                case 'jira':
                    jiraRepos.push(repo);
                    break;
            }
        }
        this.dbRepos = dbRepos
        this.githubRepos = githubRepos
        this.jiraRepos = jiraRepos*/

        this.repositories = repos;
        this.searchList = (!this.searchList) ? repos : this.searchList;
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
                console.log(user);
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
            const seSto = sessionStorage.getItem('repositories')
            if(!seSto) {
                this.apiService.getRepositories().subscribe((repositories) => {
                    this.repositories = repositories;
                    sessionStorage.setItem('repositories', JSON.stringify(repositories))
                });
            } else {
                this.repositories = JSON.parse(seSto)
            }
        }
    }


    /**
     * @ignore
     */
    ngOnInit() {
        this.isDark = this.themeService.isDarkMode();
        this.themeService.themeChanged.subscribe((changedTheme) => { 
            this.isDark = this.themeService.isDarkMode();
    });

    }

    ngOnDestroy() {
        //window.removeEventListener("storage", this.storageEventListener)
        this.routeSub.unsubscribe()
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
        localStorage.setItem('repository', userRepository.value);
        localStorage.setItem('source', userRepository.source);
        localStorage.setItem('id', userRepository._id);
        this.router.navigate(['']);
    }

    downloadProjectFeatures(repo_id) {
        if (repo_id) {
            const userRepo = this.searchList.find(repo => repo._id == repo_id);
            console.log(userRepo);
            const source = userRepo.source;
            const id = userRepo._id;
            this.apiService.downloadProjectFeatureFiles(source, id).subscribe(ret => {
                saveAs(ret, userRepo.value + '.zip');
            });
        }
    }

    searchRepos(value) {
        console.log(this.searchInput);
        this.searchInput = this.searchInput ? this.searchInput : '';
        this.searchList = [].concat(this.repositories).filter(repo => {
            if (repo.value.toLowerCase().indexOf(this.searchInput.toLowerCase()) == 0)
                return repo;
        });
    }

    update() {
        this.isDark = this.themeService.isDarkMode();
      }
    
      onDark() : boolean {
        this.update();
        return this.isDark
      }
}
