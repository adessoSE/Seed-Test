import { Component, ChangeDetectionStrategy, inject, viewChild, computed, signal, effect, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, switchMap, tap } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { NavigationEnd, Router, RouterLink, Event as RouterEvent } from '@angular/router';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ChangeJiraAccountComponent } from '../modals/change-jira-account/change-jira-account.component';
import { saveAs } from 'file-saver';
import { ThemingService } from '../Services/theming.service';
import { MatDialog } from '@angular/material/dialog';
import { CreateCustomProjectComponent } from '../modals/create-custom-project/create-custom-project.component';
import { DeleteAccountComponent } from '../modals/delete-account/delete-account.component';
import { WorkgroupEditComponent } from '../modals/workgroup-edit/workgroup-edit.component';
import { RepoSwichComponent } from '../modals/repo-swich/repo-swich.component';
import { NotificationService } from '../Services/notification.service';
import { ProjectService } from '../Services/project.service';
import { LoginService } from '../Services/login.service';
import { ManagementService } from '../Services/management.service';
import { onActionTrigger } from '../Services/action-trigger';
import { DisconnectJiraAccountComponent } from '../modals/disconnect-jira-account/disconnect-jira-account.component';
import { ImportModalComponent } from '../modals/import-modal/import-modal.component';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatSelect, MatOption } from '@angular/material/select';
import type { User } from '@seed-test/shared/models/User';


/**
 * Component to show all account data including the projects of Github, Jira and custom sources
 */
@Component({
	selector: 'app-account-management',
	templateUrl: './account-management.component.html',
	styleUrls: ['./account-management.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, MatIcon, FormsModule, MatFormField, MatLabel, MatSelect, MatOption, ChangeJiraAccountComponent, DisconnectJiraAccountComponent, CreateCustomProjectComponent, DeleteAccountComponent, WorkgroupEditComponent, RepoSwichComponent, MatTooltipModule]
})


export class AccountManagementComponent {
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
	readonly changeJiraModal = viewChild.required<ChangeJiraAccountComponent>('changeJiraModal');
	readonly disconnectJiraModal = viewChild.required<DisconnectJiraAccountComponent>('disconnectJiraModal');
	readonly createCustomProject = viewChild.required<CreateCustomProjectComponent>('createCustomProject');
	readonly deleteAccountModal = viewChild.required<DeleteAccountComponent>('deleteAccountModal');
	readonly workgroupEditModal = viewChild.required<WorkgroupEditComponent>('workgroupEditModal');
	readonly repoSwitchModal = viewChild.required<RepoSwichComponent>('repoSwitchModal');

	/**
     * Viewchild to auto open mat-select
     */
	readonly ngSelect = viewChild<MatSelect>('ngSelect');


	/**
     * Computed repository list derived from the project service signal.
     *
     * WHY: Eliminates the local copy of repositories (F3). The service's
     * repositoriesSignal is the single source of truth. Reading it here as a
     * computed keeps every consumer (template, searchList, download/export)
     * in sync without double-sync or lag.
     */
	readonly repositories = computed(() => this.projectService.repositoriesSignal());

	/**
     * Email of the user
     */
	readonly email = signal<string | undefined>(undefined);

	/**
     * Github object of the user
     */
	readonly github = signal<User['github'] | undefined>(undefined);

	/**
     * Jira object of the user
     */
	readonly jira = signal<User['jira'] | undefined>(undefined);

	/**
     * User id
     */
	id!: string;

	searchInput!: string;

	versionInput!: string;

	readonly searchList = signal<RepositoryContainer[] | undefined>(undefined);

	downloadRepoID!: string;

	readonly isDark = computed(() => this.themeService.isDark());

	isActualRepoToDelete!: boolean;

	readonly clientId = signal<string | undefined>(undefined);

	/** Current password input for password change form */
	readonly currentPassword = signal('');
	/** New password input for password change form */
	readonly newPassword = signal('');
	/** Confirmation of new password input */
	readonly confirmNewPassword = signal('');

	/** Error message from password change endpoint (e.g. wrong current password) */
	readonly passwordError = signal<string | null>(null);
	/** Whether a password change request is in flight */
	readonly loadingPassword = signal(false);

	/** Reacts to the updateRepository signal from ProjectService */
	private updateRepoEffect = effect(() => {
		const trigger = this.projectService.updateRepositoryTrigger();
		if (trigger === 0) return;
		this.updateRepos();
	});

	/**
	 * Re-syncs searchList whenever the repository signal changes.
	 *
	 * WHY: Replaces the imperative subscription chain that used to populate the
	 * local repositories/searchList copies (F3). Reading repositories() here
	 * establishes a dependency on the service signal (the single source of
	 * truth); when it changes, seperateRepos (dedup) + searchRepos (re-filter)
	 * refresh the searchList without redundant work.
	 */
	private reposChangeEffect = effect(() => {
		const repos = this.repositories();
		untracked(() => {
			this.seperateRepos(repos);
			this.searchRepos();
		});
	});

	/** Saves every rename request from ProjectService; onActionTrigger queues each one, so repeated renames are not merged */
	private renameProjectEffect = onActionTrigger(this.projectService.renameProjectTrigger, proj => this.updateRepository(proj));

	/** Clears password error when the user starts typing any password field */
	private clearPasswordErrorEffect = effect(() => {
		this.currentPassword();
		this.newPassword();
		this.confirmNewPassword();
		// Reset the error whenever the user edits a password field. Deliberately
		// do NOT read passwordError here (and set unconditionally): reading it
		// would make passwordError a dependency, so setting a fresh error from
		// changePassword() would re-fire this effect and instantly erase it —
		// the user would never see feedback. Effects in zoneless Angular run
		// reactively only when read signals change, so this fires on edits only.
		this.passwordError.set(null);
	});

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
		// One subscription replaces the former navigationSubscription + routeSub pair. takeUntilDestroyed()
		// unsubscribes automatically when the component is destroyed, so no ngOnDestroy cleanup is needed.
		this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
			this.onNavigationEnd(event);
			if (event instanceof NavigationEnd && this.router.url === '/accountManagement')
				this.updateSite('Successful');
		});
	}

	/**
	 * Redirects logged-out users to /login. It does not fetch repositories: the list comes from the
	 * project service signal and reposChangeEffect re-filters it on creation and on every change.
	 * WHY: Calling searchRepos here as well ran a second filter pass for the same entry.
	 */
	private loadAccountView() {
		if (!this.loginService.isLoggedIn())
			this.router.navigate(['/login']);
	}

	/**
	 * Runs the account view check on each entry into the account route.
	 * WHY: NavigationEnd fires after the component is created on every entry, including a direct page
	 * load, so it is the single trigger. ngOnInit must not also call this, or each entry runs it twice.
	 * Other routes are ignored here.
	 * @param event Router event; only NavigationEnd for the account route is handled
	 */
	onNavigationEnd(event: RouterEvent) {
		if (event instanceof NavigationEnd && event.urlAfterRedirects.startsWith('/accountManagement'))
			this.loadAccountView();
	}

	seperateRepos(repos: RepositoryContainer[]) {
		// repositories is now a computed derived from the service signal (F3) —
		// only the searchList needs the dedup guard to avoid redundant re-filters.
		const oldList = this.searchList();
		if (!oldList || oldList.length === 0 || oldList.some((o, i) => o._id !== repos[i]?._id)) 
			this.searchList.set(repos);
		
	}

	/**
      * Logs in to GitHub and merges that identity into this Seed account.
      * 1. The initiate endpoint proves that this session owns the account and returns a merge token.
      * 2. The token is kept in localStorage; the OAuth callback reads it and runs the merge.
      * 3. The OAuth state comes from the same /github/state flow as a plain login. The merge token is never
      *    the state: the backend accepts only the state it issued to this session, so a merge token there is rejected.
      */
	login() {
		this.loginService.initiateMergeGithub(this.id).pipe(
			tap((resp) => localStorage.setItem('mergeToken', resp.mergeToken)),
			switchMap(() => this.loginService.githubLogin())
		).subscribe({
			error: (err) => {
				// Without a state the callback cannot complete, so the stored token must not outlive this attempt
				localStorage.removeItem('mergeToken');
				this.notifyFailure('Could not initiate GitHub login. Please try again.', err);
			}
		});
	}

	/**
     * Opens Modal to create a new custom project
     */
	newRepository() {
		this.createCustomProject().openCreateCustomProjectModal(this.repositories() ?? []);
	}

	/**
     * Loggs in the user to Jira
     */
	jiraLogin() {
		this.changeJiraModal().openChangeJiraAccountModal('Jira');
	}

	/**
     * Disconnects the user from Jira
     */
	jiraDisconnect() {
		this.disconnectJiraModal().openDisconnectJiraAccountModal();
	}

	/**
     * Opens Modal to delete the Seed-Test account
     */
	deleteAccount() {
		this.deleteAccountModal().openDeleteAccountModal(this.email()!);
	}

	/**
     * Opens Modal to edit the workgroup
     * @param project
     */
	workGroupEdit(project: RepositoryContainer) {
		this.workgroupEditModal().openWorkgroupEditModal(project, this.email()!, this.id);
	}

	/**
     * Fills the Account data
     * @param report
     */
	updateSite(report: string) {
		if (report === 'Successful')
			this.managmentService.getUserData().subscribe({
				next: (user) => {
					this.id = user._id!;
					if (typeof user['email'] !== 'undefined')
						this.email.set(user['email'] as string);

					if (typeof user['github'] !== 'undefined')
						this.github.set(user['github']);

					if (typeof user['jira'] !== 'undefined') {
						this.jira.set(user['jira']);
						(document.getElementById('change-jira') as HTMLButtonElement).innerHTML = 'Change Jira-Account';
						(document.getElementById('disconnect-jira') as HTMLButtonElement).style.removeProperty('display');
					}
					this.clientId.set(localStorage.getItem('clientId') ?? '');
				},
				error: (err) => this.notifyFailure('Could not load your account data.', err)
			});
	}

	/**
     * Removes Github connection from Seed-Test Account
     */
	disconnectGithub() {
		this.managmentService.disconnectGithub().subscribe({
			next: (_resp) => window.location.reload(),
			error: (err) => this.notifyFailure('Could not disconnect GitHub. Please try again.', err)
		});
	}

	/**
     * Redirects user to Register page if the user only used a Github account and now wants to create a Seed-Test account.
     * The session identifies the account, so the id is not stored or sent: registration from this session adds the login to it.
     */
	navToRegistration() {
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
			const userRepo = this.searchList()?.find(repo => repo._id == repo_id);
			const id = userRepo!._id!;
			this.managmentService.downloadProjectFeatureFiles(id, this.versionInput).subscribe({
				next: ret => {
					if (this.versionInput)
						saveAs(ret, userRepo!.repoName + '-v' + this.versionInput + '.zip');
					else
						saveAs(ret, userRepo!.repoName + '.zip');
				},
				error: (err) => this.notifyFailure('Could not download the project features.', err)
			});
		}
	}

	exportProject(repo_id: string) {
		if (repo_id) {
			const userRepo = this.searchList()?.find(repo => repo._id == repo_id);
			const id = userRepo!._id!;
			this.managmentService.exportProject(id, this.versionInput).subscribe({
				next: ret => {
					if (this.versionInput)
						saveAs(ret, userRepo!.repoName + '-export' + '-v' + this.versionInput + '.zip');
					else
						saveAs(ret, userRepo!.repoName + '-export' + '.zip');
				},
				error: (err) => this.notifyFailure('Could not export the project.', err)
			});
		}
	}

	searchRepos() {
		this.searchInput = this.searchInput ? this.searchInput : '';
    
		// Ensure this.repositories is an array before trying to concat and filter
		const reposToFilter = this.repositories() || [];

		this.searchList.set(([] as RepositoryContainer[]).concat(reposToFilter).filter(repo => {
			// Check if repo and repo.repoName exist before calling toLowerCase()
			if (repo && repo.repoName && repo.repoName.toLowerCase().indexOf(this.searchInput.toLowerCase()) == 0)
				return repo;

			return false; // Explicitly return false if repo or repo.repoName is missing
		}));

		const ngSelect = this.ngSelect();
		if (this.searchInput != '' && ngSelect) 
			ngSelect.open();
    
	}

	/**
      * Update Repositories after change
      *
      * WHY: Reads directly from the project service's repositoriesSignal (the
      * single source of truth) instead of sessionStorage. This eliminates the
      * create/refresh race where sessionStorage would still hold stale data
      * before the HTTP response overwrites it.
      */
	updateRepos() {
		this.seperateRepos(this.projectService.repositoriesSignal());

		// update repo download list
		this.searchRepos();
	}

	/**
     * Saves a renamed project and refreshes the shared repository list.
     *
     * WHY: updateRepositoryEmitter() both signals the change and re-fetches the list. A bare getRepositories()
     * call issues no request unless subscribed, so the saved name would never reach the view.
     * @param project the project with its new name
     */
	updateRepository(project: RepositoryContainer) {
		this.projectService.updateRepository(project._id!, project.repoName, this.id).subscribe({
			next: _resp => {
				this.projectService.updateRepositoryEmitter();
				this.notify.success('successfully saved', 'Repository');
			},
			error: (err) => this.notifyFailure('Could not save the repository.', err)
		});
	}

	/**
     * Logs the error for operators and shows one short message to the user. Used by every failed request in this component.
     * @param message text shown to the user
     * @param err the error, logged but never shown
     */
	private notifyFailure(message: string, err: unknown) {
		console.error(message, err);
		this.notify.error(message);
	}

	/**
      * Opens the 'dumb' import modal and waits for the result.
      *
      * WHY: Replaces the nested subscribe chain (F3) with async/await +
      * firstValueFrom. After a successful import, getRepositories() refreshes the
      * service's repositoriesSignal, which cascades to the computed repositories()
      * and is picked up by reposChangeEffect (which re-syncs searchList). No local
      * subscription chain or manual state copy is needed.
      */
	async openImportProjectModal() {
		const dialogRef = this.modalService.open(ImportModalComponent, {
			width: '800px',
			data: {
				repoList: this.repositories()
			} 
		});

		try {
			const data = await firstValueFrom(dialogRef.afterClosed());
			if (data) {
				// *** Case 1: User clicked "Import" ***

				await firstValueFrom(
					this.managmentService.importProject(data.file, data.repoId, data.projectName, data.importMode)
				);
				this.notify.success('Project imported successfully!');
				// Refresh the repository list — service signal update drives reposChangeEffect
				this.projectService.updateRepositoryEmitter();
			} else {
				// *** Case 2: User clicked "Cancel" ***
				// Do nothing.
			}
		} catch (err) {
			// The backend's own message is shown when it sent one, since it explains why the import failed
			this.notifyFailure((err as { error?: { error?: string } })?.error?.error || 'Import failed.', err);
		}
	}

	/**
      * Changes the user's own password.
      * Validates inputs, sends { currentPassword, newPassword } to the backend,
      * and clears the form on success or shows error on 401/other failure.
      */
	async changePassword() {
		const cur = this.currentPassword();
		const nw = this.newPassword();
		const cnf = this.confirmNewPassword();

		// Reject if current password is too short (must match registration minimum)
		if (!cur || cur.length < 8) {
			this.passwordError.set('Current password must be at least 8 characters.');
			return;
		}
		// Reject if new passwords do not match
		if (nw !== cnf) {
			this.passwordError.set('New passwords do not match.');
			return;
		}
		// Enforce minimum length so the user sees it before hitting the backend
		if (nw.length < 8) {
			this.passwordError.set('New password must be at least 8 characters.');
			return;
		}

		// Guard: user id must be loaded before making the API call
		if (!this.id) {
			this.passwordError.set('User ID not available. Please refresh.');
			return;
		}

		this.loadingPassword.set(true);
		this.passwordError.set(null);

		try {
			await firstValueFrom(
				this.apiService.updateUser(this.id, { currentPassword: cur, newPassword: nw })
			);
			// Success — clear form and notify
			this.currentPassword.set('');
			this.newPassword.set('');
			this.confirmNewPassword.set('');
			this.passwordError.set(null);
			this.notify.success('Password changed successfully.');
		} catch (err: unknown) {
			// Backend returns 401 when currentPassword is incorrect
			const httpErr = err as { status?: number; error?: { message?: string } };
			if (httpErr.status === 401)
				this.passwordError.set('Current password is incorrect.');
			else
				this.passwordError.set(httpErr?.error?.message ?? 'Password change failed.');
		} finally {
			this.loadingPassword.set(false);
		}
	}
}
