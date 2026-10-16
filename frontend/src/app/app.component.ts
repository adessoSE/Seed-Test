import { Component, OnInit, ChangeDetectionStrategy, DestroyRef, ElementRef, inject, computed, effect, untracked, signal, viewChild } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ThemingService } from './Services/theming.service';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoginService } from './Services/login.service';
import { ProjectService } from './Services/project.service';
import { onActionTrigger } from './Services/action-trigger';
import { StoryService } from './Services/story.service';
import { NotificationService } from './Services/notification.service';
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
	imports: [RouterLink, RouterOutlet, MatIcon, MatSlideToggle, ReactiveFormsModule, NgClass, MatMenuModule],
	host: {
		'(document:keydown.escape)': 'onDocumentEscape($event)'
	}
})
export class AppComponent implements OnInit{
	apiService = inject(ApiService);
	router = inject(Router);
	themeService = inject(ThemingService);
	loginService = inject(LoginService);
	projectService = inject(ProjectService);
	storyService = inject(StoryService);
	private notify = inject(NotificationService);

	/**
	 * Computed repository list derived from the project service signal.
	 *
	 * WHY: The service's
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

	/**
	 * State of the Help menu. The panel is shown only while helpMenuOpen is true (the template binds
	 * the help-open class), so aria-expanded always matches what is on screen.
	 *
	 * WHY: Showing the panel from CSS :hover / :focus-within alone would let it open while aria-expanded
	 * reports false, and Escape could not close a hover-opened panel. Hover is tracked here via
	 * mouseenter/mouseleave; keyboard focus is tracked via :focus-visible, because Chrome focuses a
	 * button on mouse click and a plain focus would pin the menu open after the pointer leaves.
	 */
	readonly helpHovered = signal(false);
	readonly helpKeyboardFocus = signal(false);
	readonly helpDismissed = signal(false);
	readonly helpMenuOpen = computed(() => (this.helpHovered() || this.helpKeyboardFocus()) && !this.helpDismissed());
	/** Pending hover-close timer, see onHelpPointerLeave */
	private helpCloseTimer?: ReturnType<typeof setTimeout>;
	/** Help menu container; lets the document-level Escape handler tell whether focus is inside the menu */
	private readonly helpMenuWrapper = viewChild.required<ElementRef<HTMLElement>>('helpWrapper');

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

	/**
	 * Reloads the repository list after the create modal has saved a repository.
	 * WHY: the modal already POSTed the repository; posting it again here created duplicates.
	 */
	private createRepoTrigger = onActionTrigger(this.projectService.createRepositoryTrigger, () => this.projectService.updateRepositoryEmitter());

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
		// The hover-close timer must not fire after the component is destroyed
		inject(DestroyRef).onDestroy(() => clearTimeout(this.helpCloseTimer));
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
	 * WHY: A single await firstValueFrom call keeps the flow linear and leaves state updates to the service.
	 * The service internally updates its repositoriesSignal on success, which cascades to the computed repositories()
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
		this.projectService.selectRepository(userRepository);
		if (this.router.url !== '/') 
			this.router.navigate(['']);
		else 
			window.location.reload();
    
	}

	/**
    * Loggs out the user and redirects it to the login page
    */
	logout() {
		// Drops the cached getRepositories() request, the signal and the sessionStorage copy; without the
		// cache reset the next login replays the previous user's project list
		this.projectService.clearRepositories();
		// Local session data is already cleared by logoutUser(); a failed server call only
		// means the server-side session may still be alive, so the user is told rather than silently ignored.
		this.loginService.logoutUser().subscribe({
			next: () => {
				//
			},
			error: (err) => {
				console.error('Logout request failed:', err);
				this.notify.error('Logout on the server failed. Your browser session was cleared.');
			}
		});
		this.router.navigate(['/login']);
	}

	setModeOnToggle(isDark: boolean) {
		this.themeService.setNewTheme(isDark);
	}

	/**
	 * Escape closes the Help menu. helpDismissed hides the panel even while it is hovered or focused;
	 * focus is moved back to the trigger first so the keyboard user keeps their place instead of
	 * dropping to the document body when a link inside the panel had focus.
	 * @param wrapper The Help menu container that owns the trigger and the panel
	 */
	dismissHelpMenu(wrapper: HTMLElement) {
		this.helpDismissed.set(true);
		wrapper.querySelector<HTMLElement>('.help-button')?.focus();
	}

	/**
	 * Closes the Help menu on Escape pressed anywhere in the document. Escape with focus inside the menu
	 * is handled by the wrapper's (keydown.escape) binding, so events from inside are skipped here to
	 * avoid a second dismissal.
	 * WHY: A hover-opened panel has no keyboard focus, so the wrapper binding never sees its Escape.
	 * Focus is not moved here: the caller's focus stays where it is, unlike dismissHelpMenu.
	 * @param event The document keydown event
	 */
	onDocumentEscape(event: KeyboardEvent) {
		if (!this.helpMenuOpen()) return;
		if (this.helpMenuWrapper().nativeElement.contains(event.target as Node)) return;
		this.helpDismissed.set(true);
	}

	/**
	 * Clears the Help menu focus state once focus leaves the whole menu, so the next Tab into it
	 * opens the panel again. Focus moving between the trigger and the panel links keeps it open.
	 * @param event The focusout event from the Help menu container
	 * @param wrapper The Help menu container, used to test whether the new focus target is inside it
	 */
	onHelpFocusOut(event: FocusEvent, wrapper: HTMLElement) {
		if (wrapper.contains(event.relatedTarget as Node | null)) return;
		this.helpKeyboardFocus.set(false);
		this.helpDismissed.set(false);
	}

	/**
	 * Opens the Help menu on keyboard focus only. :focus-visible is false for a button focused by a
	 * mouse click, so clicking Help does not keep the panel open after the pointer leaves.
	 * @param event The focusin event from the Help menu container
	 */
	onHelpFocusIn(event: FocusEvent) {
		this.helpKeyboardFocus.set((event.target as HTMLElement).matches(':focus-visible'));
	}

	/**
	 * Opens the Help menu while the pointer is over it. Re-entering cancels a pending close.
	 */
	onHelpPointerEnter() {
		clearTimeout(this.helpCloseTimer);
		this.helpHovered.set(true);
	}

	/**
	 * Closes the Help menu 200 ms after the pointer leaves. The delay stops flicker when the pointer
	 * crosses the gap between trigger and panel. An Escape dismissal is kept while keyboard focus is
	 * still in the menu; onHelpFocusOut clears it when focus leaves, so the menu cannot re-open
	 * on the still-focused trigger without a new hover or focus.
	 */
	onHelpPointerLeave() {
		clearTimeout(this.helpCloseTimer);
		this.helpCloseTimer = setTimeout(() => {
			this.helpHovered.set(false);
			// Keyboard focus still in the menu keeps the Escape dismissal in place
			if (!this.helpKeyboardFocus()) this.helpDismissed.set(false);
		}, 200);
	}
}
