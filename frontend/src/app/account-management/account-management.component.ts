import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { NavigationEnd, Router } from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { ChangeJiraAccountComponent } from '../modals/change-jira-account/change-jira-account.component';
import { Subscription } from 'rxjs/internal/Subscription';
import { saveAs } from 'file-saver';
import { ThemingService } from '../Services/theming.service';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { CreateCustomProjectComponent } from '../modals/create-custom-project/create-custom-project.component';
import { DeleteAccountComponent } from '../modals/delete-account/delete-account.component';
import { WorkgroupEditComponent } from '../modals/workgroup-edit/workgroup-edit.component';
import { RepoSwichComponent } from '../modals/repo-swich/repo-swich.component';
import { ToastrService } from 'ngx-toastr';
import { ProjectService } from '../Services/project.service';
import { LoginService } from '../Services/login.service';
import { ManagementService } from '../Services/management.service';
import { DisconnectJiraAccountComponent } from '../modals/disconnect-jira-account/disconnect-jira-account.component';
import { ImportModalComponent } from '../modals/import-modal/import-modal.component';

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
    @ViewChild('disconnectJiraModal') disconnectJiraModal: DisconnectJiraAccountComponent;
    @ViewChild('createCustomProject') createCustomProject: CreateCustomProjectComponent;
    @ViewChild('deleteAccountModal') deleteAccountModal: DeleteAccountComponent;
    @ViewChild('workgroupEditModal') workgroupEditModal: WorkgroupEditComponent;
    @ViewChild('repoSwitchModal') repoSwitchModal: RepoSwichComponent;

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

    versionInput: string;

    searchList: RepositoryContainer[];

    downloadRepoID: string;

    isDark: boolean;

    isActualRepoToDelete: boolean;

    clientId: string;

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
     * @param projectService Connection to the project service
     * @param loginService Connection to the login service
     * @param managmentService Connection to the managment service
     * @param router router to handle url changes
     * @param themeService
     * @param toastr
     */
    constructor(public apiService: ApiService,
        public projectService: ProjectService,
        public loginService: LoginService,
        public managmentService: ManagementService,
        public router: Router,
        private dialog: MatDialog,
        public themeService: ThemingService,
        private toastr: ToastrService
        ) {
        this.routeSub = this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd && this.router.url === '/accountManagement') {
                this.updateSite('Successful'); //
            }
        });
        if (!this.router.events) {
            this.getRepositoriesObservable = this.projectService.getRepositoriesEvent.subscribe((repositories) => {
                this.seperateRepos(repositories);
            });
        }
    }

    ngOnInit() {
        this.updateRepositoryObservable = this.projectService.updateRepositoryEvent.subscribe(() => this.updateRepos());

        this.isDark = this.themeService.isDarkMode();
        this.themeObservable = this.themeService.themeChanged.subscribe((changedTheme) => {
            this.isDark = this.themeService.isDarkMode();
        });
        this.renamePrjectObservable = this.projectService.renameProjectEvent.subscribe(proj => {
            this.updateRepository(proj);
        });

        // fill repository list for download
        this.searchRepos();
    }

    ngOnDestroy() {
        if (!this.themeObservable.closed) {
            this.themeObservable.unsubscribe();
        }
        if (!this.updateRepositoryObservable.closed) {
            this.updateRepositoryObservable.unsubscribe();
        }
        if (!this.routeSub.closed) {
            this.routeSub.unsubscribe();
        }
        if (this.getRepositoriesObservable) {
            if (!this.getRepositoriesObservable.closed) {
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
        this.loginService.githubLogin();
    }

    /**
     * Opens Modal to create a new custom project
     */
    newRepository() {
        this.createCustomProject.openCreateCustomProjectModal(this.repositories);
    }

    /**
     * Loggs in the user to Jira
     */
    jiraLogin() {
        this.changeJiraModal.openChangeJiraAccountModal('Jira');
    }

    /**
     * Disconnects the user from Jira
     */
    jiraDisconnect() {
        this.disconnectJiraModal.openDisconnectJiraAccountModal();
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
    workGroupEdit(project: RepositoryContainer) {
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
            this.managmentService.getUserData().subscribe(user => {
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
                    (document.getElementById("disconnect-jira") as HTMLButtonElement).style.removeProperty('display');
                }
                this.clientId = localStorage.getItem('clientId')
            });
            this.getSessionStorage();
        }
    }

    /**
     * Removes Github connection from Seed-Test Account
     */
    disconnectGithub() {
        this.managmentService.disconnectGithub().subscribe((resp) => {
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
            const id = userRepo._id;
            this.managmentService.downloadProjectFeatureFiles(id, this.versionInput).subscribe(ret => {
                this.versionInput ? saveAs(ret, userRepo.value + '-v' + this.versionInput + '.zip') : saveAs(ret, userRepo.value + '.zip');
            })
        }
    }

    exportProject(repo_id) {
        if (repo_id) {
            const userRepo = this.searchList.find(repo => repo._id == repo_id);
            console.log(userRepo);
            const source = userRepo.source;
            const id = userRepo._id;
            this.managmentService.exportProject(id, this.versionInput).subscribe(ret => {
                this.versionInput ? saveAs(ret, userRepo.value + '-export' + '-v' + this.versionInput + '.zip') : saveAs(ret, userRepo.value + '-export' + '.zip');
            })
        }
    }

    searchRepos() {
        this.searchInput = this.searchInput ? this.searchInput : '';
        this.searchList = [].concat(this.repositories).filter(repo => {
            if (repo.value.toLowerCase().indexOf(this.searchInput.toLowerCase()) == 0) {
                return repo;
            }
        });
        if (this.searchInput != '') {
            this.ngSelect.open();
        }
    }

    /**
     * Update Repositories after change
     */
    updateRepos() {
        const value = sessionStorage.getItem('repositories');
        const repository: RepositoryContainer = JSON.parse(value);
        this.seperateRepos(repository);

        // update repo download list
        this.searchRepos();
    }

    updateRepository(project: RepositoryContainer) {
        this.projectService.updateRepository(project._id, project.value, this.id).subscribe(_resp => {
            this.projectService.getRepositories();
            this.toastr.success('successfully saved', 'Repository');
        });
    }

    openImportPopup() {
        this.dialog.open(ImportModalComponent,{
            width: '60%',
            enterAnimationDuration: '180ms',
            exitAnimationDuration: '180ms',
            data:{
                repoList: this.repositories
            }
        })
    }
}
