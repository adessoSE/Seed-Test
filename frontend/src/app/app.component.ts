import { Component, ElementRef, HostListener, OnInit, AfterViewInit, ChangeDetectionStrategy, inject, viewChild, signal, computed, effect, untracked } from '@angular/core';
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


/**
 * Master Component
 */
@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, RouterOutlet, MatIcon, MatSlideToggle, ReactiveFormsModule, NgClass]
})
export class AppComponent implements OnInit, AfterViewInit{
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

	readonly dropdownMenu = viewChild.required<ElementRef>('dropdownMenu');
	readonly helpMenu = viewChild.required<ElementRef>('helpMenu');

	closed: boolean = false;
	helpPosition!: number;
	menuPosition!: number;

	readonly isDark = computed(() => this.themeService.isDark());

	toggleControl = new UntypedFormControl(false);

	/**
  * Subscribtions for all EventEmitter
  */
	/** Triggers logout when service emits */
	private logoutEffect = effect(() => {
		const trigger = this.loginService.logoutTrigger();
		if (trigger === 0) return;
		this.logout();
	});

	/** Refreshes repositories when service triggers */
	private getReposEffect = effect(() => {
		const trigger = this.projectService.getRepositoriesTrigger();
		if (trigger === 0) return;
		this.getRepositories();
	});

	/** Updates repositories when service triggers */
	private updateReposEffect = effect(() => {
		const trigger = this.projectService.updateRepositoryTrigger();
		if (trigger === 0) return;
		this.updateRepositories();
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
		if (!this.apiService.urlReceived)
			this.apiService.getBackendInfo();

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

	ngAfterViewInit(){
		this.helpPosition = this.dropdownMenu().nativeElement.offsetTop;
		this.menuPosition = this.helpMenu().nativeElement.offsetTop;

	}

	@HostListener('window:scroll')
	handleScroll() {
		const windowScroll = window.scrollY;
		if (windowScroll > this.helpPosition) 
			this.closed = true;
		else 
			this.closed = false;
      
	}

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
}
