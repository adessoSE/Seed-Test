import {Component, OnInit, OnDestroy, ViewChild, EventEmitter, Output} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { ChangeJiraAccountComponent } from '../modals/change-jira-account/change-jira-account.component';
import {Subscription} from 'rxjs/internal/Subscription';
import { saveAs } from 'file-saver';
import { ThemingService } from '../Services/theming.service';
import {interval} from 'rxjs';
import {map} from 'rxjs/operators';
import { CreateCustomProjectComponent } from '../modals/create-custom-project/create-custom-project.component';
import { DeleteAccountComponent } from '../modals/delete-account/delete-account.component';
import { WorkgroupEditComponent } from '../modals/workgroup-edit/workgroup-edit.component';
import { RepoSwichComponent } from '../modals/repo-swich/repo-swich.component';
import { RenameProjectComponent } from '../modals/rename-project/rename-project.component';
import { ToastrService } from 'ngx-toastr';

/**
 * Component to show all account data including the projects of Github, Jira and custom sources
 */
@Component({
    selector: 'app-account-management',
    templateUrl: './account-management.component.html',
    styleUrls: ['./account-management.component.css']
})


export class AccountManagementComponent implements OnInit, OnDestroy {
    /**
     * Viewchild to create the modals
     */
    @ViewChild('changeJiraModal') changeJiraModal: ChangeJiraAccountComponent;
    @ViewChild('createCustomProject') createCustomProject :CreateCustomProjectComponent;
    @ViewChild('deleteAccountModal') deleteAccountModal: DeleteAccountComponent;
    @ViewChild('workgroupEditModal') workgroupEditModal: WorkgroupEditComponent;
    @ViewChild('repoSwitchModal') repoSwitchModal: RepoSwichComponent;
    @ViewChild('renameProjectModal') renameProjectModal: RenameProjectComponent;

    /**
     * Viewchild to auto open mat-select
     */
    @ViewChild('ngSelect') ngSelect;


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

    searchInput: string;

    searchList: RepositoryContainer[];

    downloadRepoID: string;

    isDark: boolean;

    isActualRepoToDelete: boolean;

    selectedRepo: RepositoryContainer;

    /**
     * Subscribtions for all EventEmitter
     */
    routeSub: Subscription;
    updateRepositoryObservable: Subscription;
    themeObservable: Subscription;
    getRepositoriesObservable: Subscription;
    renamePrjectObservable: Subscription;

    /**
     * Constructor
     * @param apiService Connection to the api service
     * @param router router to handle url changes
     * @param themeService
     */
    constructor(public apiService: ApiService, public router: Router, public themeService: ThemingService, private toastr: ToastrService,) {
        this.routeSub = this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd && this.router.url === '/accountManagement') {
                this.updateSite('Successful'); //
            }
        });
        if (!this.router.events) {
            this.getRepositoriesObservable = this.apiService.getRepositoriesEvent.subscribe((repositories) => {
                this.seperateRepos(repositories);
            });
        }
        
    }

    ngOnInit() {
        this.updateRepositoryObservable = this.apiService.updateRepositoryEvent.subscribe(() => this.updateRepos());

        this.isDark = this.themeService.isDarkMode();
        this.themeObservable = this.themeService.themeChanged.subscribe((changedTheme) => {
            this.isDark = this.themeService.isDarkMode();
        });
        this.renamePrjectObservable = this.apiService.renameProjectEvent.subscribe(newName => {
            this.renameProject(newName);
        })

        // fill repository list for download
        this.searchRepos('')
    }

    ngOnDestroy() {
        if(!this.themeObservable.closed){
            this.themeObservable.unsubscribe();
        }
        if(!this.updateRepositoryObservable.closed){
            this.updateRepositoryObservable.unsubscribe();
        }
        if(!this.routeSub.closed){
            this.routeSub.unsubscribe();
        }
        if(this.getRepositoriesObservable){
            if(!this.getRepositoriesObservable.closed){
                this.getRepositoriesObservable.unsubscribe();
            }
        }
        if (this.renamePrjectObservable.closed) {
            this.renamePrjectObservable.unsubscribe();
        }
    }

    seperateRepos(repos) {
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
        this.createCustomProject.openCreateCustomProjectModal();
    }

    /**
     * Loggs in the user to Jira
     */
    jiraLogin() {
        this.changeJiraModal.openChangeJiraAccountModal('Jira');
    }

    /**
     * Opens Modal to delete the Seed-Test account
     */
    deleteAccount() {
        this.deleteAccountModal.openDeleteAccountModal(this.email);
    }

    /**
     * Opens Modal to edit the workgroup
     * @param project
     */
    workGroupEdit(project: RepositoryContainer){
        this.workgroupEditModal.openWorkgroupEditModal(project, this.email, this.id);
    }

    /**
     * gets repositories from Session storage if available
     * if not available, it requests them from backend in 500 ms interval
     * finally: sets this.repositories
     */
    getSessionStorage() {
        const seSto = sessionStorage.getItem('repositories');
        if (!seSto) {
            const repositories = interval(500)
              .pipe(map(() => sessionStorage.getItem('repositories')))
              .subscribe(data => {
                  if (data) {
                      this.repositories = JSON.parse(data);
                      repositories.unsubscribe();
                  }
              });
        } else {
            this.repositories = JSON.parse(seSto);
        }
    }

    /**
     * Fills the Account data
     * @param report
     */
    updateSite(report: String) {
        if (report === 'Successful') {
            this.apiService.getUserData().subscribe(user => {
                this.id = user._id;
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
            this.getSessionStorage();
        }
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
        this.searchInput = this.searchInput ? this.searchInput : '';
        this.searchList = [].concat(this.repositories).filter(repo => {
            if (repo.value.toLowerCase().indexOf(this.searchInput.toLowerCase()) == 0) {
                return repo;
            }
        });
        if(this.searchInput != ''){
            this.ngSelect.open();
        }
    }

    /**
     * Update Repositories after change
     */
    updateRepos(){
        let value = sessionStorage.getItem('repositories')
        let repository: RepositoryContainer = JSON.parse(value)
        this.seperateRepos(repository)

        // update repo download list
        this.searchRepos('')
    } 

    openChangeProjectName(repo : RepositoryContainer) {
        this.selectedRepo = repo;
        this.renameProjectModal.openRenameProjectModal(this.selectedRepo.value);
    }

    /**
     * Renames project name
     * @param newName 
     */
    renameProject(newName : string) {
        if(newName.replace(/\s/g, '').length > 0) {
            this.selectedRepo.value = newName;
        }
        this.updateRepository();
    }

    updateRepository(){
        this.apiService.updateRepository(this.selectedRepo._id, this.selectedRepo.value, this.id).subscribe(_resp => {      
            this.apiService.getRepositories();
            this.toastr.success('successfully saved', 'Repository');
        });
    }
}
