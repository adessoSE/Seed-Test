import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { NavigationEnd, Router } from '@angular/router';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
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
import { NotificationService } from '../Services/notification.service';
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
	styleUrls: ['./account-management.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})


export class AccountManagementComponent implements OnInit, OnDestroy {
	apiService = inject(ApiService);
	projectService = inject(ProjectService);
	loginService = inject(LoginService);
	managmentService = inject(ManagementService);
	router = inject(Router);
	modalService = inject(MatDialog);
	themeService = inject(ThemingService);
	private notify = inject(NotificationService);

	/**
     * Viewchild to create the modals
     */
	@ViewChild('changeJiraModal') changeJiraModal!: ChangeJiraAccountComponent;
	@ViewChild('disconnectJiraModal') disconnectJiraModal!: DisconnectJiraAccountComponent;
	@ViewChild('createCustomProject') createCustomProject!: CreateCustomProjectComponent;
	@ViewChild('deleteAccountModal') deleteAccountModal!: DeleteAccountComponent;
	@ViewChild('workgroupEditModal') workgroupEditModal!: WorkgroupEditComponent;
	@ViewChild('repoSwitchModal') repoSwitchModal!: RepoSwichComponent;

	/**
     * Viewchild to auto open mat-select
     */
	@ViewChild('ngSelect') ngSelect: any;


	/**
     * Repositories or projects of this user
     */

	repositories!: RepositoryContainer[];

	/**
     * Email of the user
     */
	email!: string;

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
	id!: string;

	searchInput!: string;

	versionInput!: string;

	searchList!: RepositoryContainer[];

	navigationSubscription: Subscription;

	downloadRepoID!: string;

	isDark!: boolean;

	isActualRepoToDelete!: boolean;

	clientId!: string;

	/**
     * Subscribtions for all EventEmitter
     */
	routeSub: Subscription;
	updateRepositoryObservable!: Subscription;
	themeObservable!: Subscription;
	getRepositoriesObservable!: Subscription;
	renameProjectObservable!: Subscription;

	/**
     * Constructor
     * @param apiService Connection to the api service
     * @param projectService Connection to the project service
     * @param loginService Connection to the login service
     * @param managmentService Connection to the managment service
     * @param router router to handle url changes
     * @param themeService
     * @param notify
     */
	constructor() {
		const themeService = this.themeService;

		this.themeService = themeService;
		this.navigationSubscription = this.router.events.subscribe((e: any) => {
			// If it is a NavigationEnd event re-initalise the component
			if (e instanceof NavigationEnd) 
				this.ngOnInit();
            
		});
		this.routeSub = this.router.events.subscribe(event => {
			if (event instanceof NavigationEnd && this.router.url === '/accountManagement') 
				this.updateSite('Successful'); //
                
		});
		if (!this.router.events) 
			this.getRepositoriesObservable = this.projectService.getRepositoriesEvent.subscribe((repositories) => {
				this.seperateRepos(repositories);
			});
            
	}

	ngOnInit() {
		if (!this.loginService.isLoggedIn()) 
			this.router.navigate(['/login']);
        
		this.updateRepositoryObservable = this.projectService.updateRepositoryEvent.subscribe(() => this.updateRepos());

		this.isDark = this.themeService.isDarkMode();
		this.themeObservable = this.themeService.themeChanged.subscribe((_changedTheme) => {
			this.isDark = this.themeService.isDarkMode();
		});
		this.renameProjectObservable = this.projectService.renameProjectEvent.subscribe(proj => {
			this.updateRepository(proj);
		});

		// fill repository list for download
		this.searchRepos();
	}

	ngOnDestroy() {
		if (!this.themeObservable.closed) 
			this.themeObservable.unsubscribe();
        
		if (!this.updateRepositoryObservable.closed) 
			this.updateRepositoryObservable.unsubscribe();
        
		if (!this.routeSub.closed) 
			this.routeSub.unsubscribe();
        
		if (this.getRepositoriesObservable) 
			if (!this.getRepositoriesObservable.closed) 
				this.getRepositoriesObservable.unsubscribe();
            
        
		if (this.renameProjectObservable.closed) 
			this.renameProjectObservable.unsubscribe();
        
		if (this.navigationSubscription) 
			this.navigationSubscription.unsubscribe();
        
	}

	seperateRepos(repos: RepositoryContainer[]) {
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
		} else 
			this.repositories = JSON.parse(seSto);
        
	}

	/**
     * Fills the Account data
     * @param report
     */
	updateSite(report: string) {
		if (report === 'Successful') {
			this.managmentService.getUserData().subscribe(user => {
				this.id = user._id!;
				if (typeof user['email'] !== 'undefined')
					this.email = user['email'] as string;
                
				if (typeof user['github'] !== 'undefined') 
					this.github = user['github'];
                
				if (typeof user['jira'] !== 'undefined') {
					this.jira = user['jira'];
					(document.getElementById('change-jira') as HTMLButtonElement).innerHTML = 'Change Jira-Account';
					(document.getElementById('disconnect-jira') as HTMLButtonElement).style.removeProperty('display');
				}
				this.clientId = localStorage.getItem('clientId') ?? '';
			});
			this.getSessionStorage();
		}
	}

	/**
     * Removes Github connection from Seed-Test Account
     */
	disconnectGithub() {
		this.managmentService.disconnectGithub().subscribe((_resp) => {
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
		ref.href = 'https://github.com/' + userRepository.repoName;
		localStorage.setItem('repository', userRepository.repoName);
		localStorage.setItem('source', userRepository.source);
		localStorage.setItem('id', userRepository._id!);
		this.router.navigate(['']);
	}

	downloadProjectFeatures(repo_id: string) {
		if (repo_id) {
			const userRepo = this.searchList.find(repo => repo._id == repo_id);
			console.log(userRepo);
			const id = userRepo!._id!;
			this.managmentService.downloadProjectFeatureFiles(id, this.versionInput).subscribe(ret => {
				if (this.versionInput)
					saveAs(ret, userRepo!.repoName + '-v' + this.versionInput + '.zip');
				else
					saveAs(ret, userRepo!.repoName + '.zip');
				
			});
		}
	}

	exportProject(repo_id: string) {
		if (repo_id) {
			const userRepo = this.searchList.find(repo => repo._id == repo_id);
			console.log(userRepo);
			const id = userRepo!._id!;
			this.managmentService.exportProject(id, this.versionInput).subscribe(ret => {
				if (this.versionInput)
					saveAs(ret, userRepo!.repoName + '-export' + '-v' + this.versionInput + '.zip');
				else
					saveAs(ret, userRepo!.repoName + '-export' + '.zip');
				
			});
		}
	}

	searchRepos() {
		this.searchInput = this.searchInput ? this.searchInput : '';
    
		// Ensure this.repositories is an array before trying to concat and filter
		const reposToFilter = this.repositories || [];

		this.searchList = ([] as RepositoryContainer[]).concat(reposToFilter).filter(repo => {
			// Check if repo and repo.repoName exist before calling toLowerCase()
			if (repo && repo.repoName && repo.repoName.toLowerCase().indexOf(this.searchInput.toLowerCase()) == 0) 
				return repo;
        
			return false; // Explicitly return false if repo or repo.repoName is missing
		});

		if (this.searchInput != '' && this.ngSelect) 
			this.ngSelect.open();
    
	}

	/**
     * Update Repositories after change
     */
	updateRepos() {
		const value = sessionStorage.getItem('repositories');
		const repository: RepositoryContainer[] = JSON.parse(value!);
		this.seperateRepos(repository);

		// update repo download list
		this.searchRepos();
	}

	updateRepository(project: RepositoryContainer) {
		this.projectService.updateRepository(project._id!, project.repoName, this.id).subscribe(_resp => {
			this.projectService.getRepositories();
			this.notify.success('successfully saved', 'Repository');
		});
	}

	/**
   * Opens the 'dumb' import modal and waits for the result.
   * This component is now responsible for calling the service.
   */
	openImportProjectModal() {
		const dialogRef = this.modalService.open(ImportModalComponent, {
			width: '800px',
			data: { 
				repoList: this.repositories
			} 
		});

		dialogRef.afterClosed().subscribe(data => {
			if (data) {
				// *** Case 1: User clicked "Import" ***
				console.log('Modal closed with data, starting import:', data);

				this.managmentService.importProject(data.file, data.repoId, data.projectName, data.importMode)
					.subscribe({
						next: (ret) => {
							console.log(ret);
							this.notify.success('Project imported successfully!');
							// Refresh the repository list
							this.projectService.getRepositories().subscribe(resp => {
								this.seperateRepos(resp);
								this.searchRepos();
							});
						},
						error: (err) => {
							console.error('Import failed:', err);
							this.notify.error(err.error?.error || 'Import failed.');
						}
					});
			} else 
			// *** Case 2: User clicked "Cancel" ***
			// Do nothing.
				console.log('Modal dismissed (Cancel clicked)');
        
		});
	}
}
