import { Component, OnInit, ChangeDetectionStrategy, inject, computed, effect, untracked } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
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
import { environment } from '../environments/environment';


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
	 * Computed repository list derived from the project service signal.
	 *
	 * WHY: Eliminates the third copy of the repository list (F2). The service's
	 * repositoriesSignal is the single source of truth; this computed ensures
	 * the template always reflects the latest data without double-sync or lag.
	 */
	readonly repositories = computed(() => this.projectService.repositoriesSignal());

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

	closed: boolean = false;
	helpPosition!: number;
	menuPosition!: number;

	readonly isDark = computed(() => this.themeService.isDark());

	env!: string;

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
		this.version = environment.version;
		this.env = environment.env;
	}

	/**
   * Retrieves Repositories
   */
	ngOnInit() {
		// Backend info is already initialized by APP_INITIALIZER — no need to call getBackendInfo() here

		this.themeService.loadTheme();
		if (this.isDark())
			this.toggleControl.setValue(true);

		// Load the repository list on initial navigation to the app
		this.getRepositories();
	}

	/** Switches theme when toggle value changes */
	private readonly toggleEffect = effect(() => {
		const val = this.toggleValue();
		if (val === undefined) return;
		this.setModeOnToggle(val);
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
	 * Fetches repositories from the server using async/await (one-shot read).
	 *
	 * WHY: Replaces the .subscribe() → signal.set() pattern (F2) with a single
	 * await firstValueFrom call. The service internally updates its
	 * repositoriesSignal on success, which cascades to the computed repositories()
	 * and all consumers. Errors are handled by the service (signal retains the
	 * last good value on transient failures; 401/403 clears it).
	 */
	async getRepositories() {
		if (!this.loginService.isLoggedIn()) return;
		try {
			await firstValueFrom(this.projectService.getRepositories());
		} catch {
			// Error handled by service internally — signal retains last good value.
		}
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
		this.projectService.repositoriesSignal.set([]);
		this.loginService.logoutUser().subscribe(_ => {
			//
		});
		this.router.navigate(['/login']);
	}

	setModeOnToggle(isDark: boolean) {
		this.themeService.setNewTheme(isDark);
	}
}
