import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed, effect, untracked } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { ThemingService } from './Services/theming.service';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoginService } from './Services/login.service';
import { ProjectService } from './Services/project.service';
import { StoryService } from './Services/story.service';
import { NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';


/**
 * Master Component
 */
@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, RouterOutlet, MatIcon, MatSlideToggle, ReactiveFormsModule, NgClass, MatMenuModule]
})
export class AppComponent implements OnInit{
	apiService = inject(ApiService);
	router = inject(Router);
	themeService = inject(ThemingService);
	loginService = inject(LoginService);
	projectService = inject(ProjectService);
	storyService = inject(StoryService);


	/**
   * Currently retrieved projects
   */
	readonly repositories = signal<RepositoryContainer[] | undefined>(undefined);

	/**
   * If the impressum is shown
   */
	showImpressum: boolean = false;

	/**
   * If the terms are shown
   */
	showTerms: boolean = false;

	/**
   * Version 
   */
	version : string;

	/**
   * Error during retrieving the projects
   */
	error!: string;

	closed: boolean = false;
	helpPosition!: number;
	menuPosition!: number;
	private closeHelpTimeout: ReturnType<typeof setTimeout> | null = null;

	readonly isDark = computed(() => this.themeService.isDark());

	toggleControl = new UntypedFormControl(false);

	/**
  * Subscribtions for all EventEmitter
  */
	/** Triggers logout when service emits */
	private logoutEffect = effect(() => {
		const trigger = this.loginService.logoutTrigger();
		if (trigger === 0) return;
		untracked(() => this.logout());
	});

	/** Refreshes repositories when service triggers */
	private getReposEffect = effect(() => {
		const trigger = this.projectService.getRepositoriesTrigger();
		if (trigger === 0) return;
		untracked(() => this.getRepositories());
	});

	/** Updates repositories when service triggers */
	private updateReposEffect = effect(() => {
		const trigger = this.projectService.updateRepositoryTrigger();
		if (trigger === 0) return;
		untracked(() => this.updateRepositories());
	});

	/** Creates repository when service emits creation data */
	private createRepoEffect = effect(() => {
		const custom = this.projectService.createRepositoryValue();
		if (!custom) return;
		untracked(() => this.handleCreateRepo(custom));
	});

	/** Creates a repository via API and reloads the repository list */
	// Payload shape matches ProjectService's CreateRepositoryPayload (not exported — kept inline here)
	private async handleCreateRepo(custom: { repositoryContainer: RepositoryContainer; name: string }) {
		await firstValueFrom(this.projectService.createRepository(custom.name, custom.repositoryContainer._id!));
		this.getRepositories();
	}

	/** Theme toggle value as a signal — drives dark/light mode switching */
	private readonly toggleValue = toSignal(this.toggleControl.valueChanges);


	/**
   * Constructor
   * @param apiService
   * @param router
   * @param themeService
   * @param loginService
   * @param projectService
   * @param storyService
   */

	constructor() {
		this.version = localStorage.getItem('version')!;
	}

	/**
   * Retrieves Repositories
   */
	ngOnInit() {
		// Backend info is already initialized by APP_INITIALIZER — no need to call getBackendInfo() here

		this.themeService.loadTheme();
		if (this.isDark())
			this.toggleControl.setValue(true);

	}

	/** Switches theme when toggle value changes */
	private readonly toggleEffect = effect(() => {
		const val = this.toggleValue();
		if (val === undefined) return;
		untracked(() => this.setModeOnToggle(val));
	});



	/**
   * Opens the terms section
   */
	openTerms() {
		this.showImpressum = false;
		this.showTerms = !this.showTerms;
		if (this.showTerms) {
			const footer: HTMLElement = document.getElementById('footer')!;
			footer.scrollIntoView();
		}
	}

	/**
   * Opens the impressum section
   */
	openImpressum() {
		this.showTerms = false;
		this.showImpressum = !this.showImpressum;
		if (this.showImpressum) {
			const footer: HTMLElement = document.getElementById('footer')!;
			footer.scrollIntoView();
		}
	}

	/**
   * Gets the repositories
   */
	getRepositories() {
		if (this.loginService.isLoggedIn()) 
			this.projectService.getRepositories().subscribe((resp) => {
				this.repositories.set(resp);
			}, (err) => {
				this.error = err.error;
			});
    
	}

	/**
     * Update Repositories after change
     */
	updateRepositories() {
		//this.apiService.getRepositories().subscribe((repositories) => {this.seperateRepos(repositories)});
		const value = sessionStorage.getItem('repositories');
		const repository: RepositoryContainer[] = JSON.parse(value!);
		this.repositories.set(repository);
	}

	/**
   * Selects a project from the project list
   * @param userRepository
   */
	selectRepository(userRepository: RepositoryContainer) {
		const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
		ref.href = 'https://github.com/' + userRepository.repoName;
		localStorage.setItem('repository', userRepository.repoName);
		localStorage.setItem('source', userRepository.source);
		localStorage.setItem('id', userRepository._id!);
		if (this.router.url !== '/') 
			this.router.navigate(['']);
		else 
			window.location.reload();
    
	}

	/**
   * Loggs out the user and redirects it to the login page
   */
	logout() {
		this.repositories.set(undefined);
		this.loginService.logoutUser().subscribe(_ => {
			//
		});
		this.router.navigate(['/login']);
	}

	setModeOnToggle(isDark: boolean) {
		this.themeService.setNewTheme(isDark);
	}

	/**
	 * Opens the help menu on hover. Cancels any pending close timer so rapid
	 * mouse movement back over the button keeps the menu open.
	 */
	onHelpHover(trigger: { openMenu: () => void }) {
		if (this.closeHelpTimeout) {
			clearTimeout(this.closeHelpTimeout);
			this.closeHelpTimeout = null;
		}
		trigger.openMenu();
	}

	/**
	 * Starts a delayed close timer on mouse leave (300ms). Gives the user time
	 * to move from the button to the menu panel before it closes. If the mouse
	 * re-enters the button during this window, onHelpHover cancels the timer.
	 */
	onHelpLeave(trigger: { closeMenu: () => void }) {
		this.closeHelpTimeout = setTimeout(() => {
			trigger.closeMenu();
		}, 300);
	}
}
