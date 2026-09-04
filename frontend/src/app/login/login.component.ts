import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ChangeDetectionStrategy, inject, computed, signal, effect, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {ApiService} from '../Services/api.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ThemingService } from '../Services/theming.service';

import { OwlOptions, CarouselModule } from 'ngx-owl-carousel-o';
import { LoginService } from '../Services/login.service';
import { ProjectService } from '../Services/project.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

/**
 * Component to handle the client login
 */
@Component({
	selector: 'app-login',
	templateUrl: './login.component.html',
	styleUrls: ['./login.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CarouselModule, FormsModule, MatProgressSpinner, RouterLink, MatIconModule]
})
export class LoginComponent implements OnInit, AfterViewInit {
	loginService = inject(LoginService);
	apiService = inject(ApiService);
	router = inject(Router);
	private route = inject(ActivatedRoute);
	private cdr = inject(ChangeDetectorRef);
	themeService = inject(ThemingService);
	projectServise = inject(ProjectService);


	/**
     * Repositories / projects of the user
     */
	repositories!: RepositoryContainer[];

	/**
     * Login error
     */
	readonly error = signal<string | undefined>(undefined);
	defaultErrorMessage = 'Wrong Username Or Password';

	/**
     * Boolean to see if the repository is loading
     */
	readonly isLoadingRepositories = signal(false);

	currentTheme!: string;

	readonly isDark = computed(() => this.themeService.isDark());

	clientId: string;

	/**
     * Subscribtions for all EventEmitter
     */
	/** Query params as a signal — watches for GitHub OAuth callback code */
	private readonly queryParams = toSignal(this.route.queryParams);

	/**
     * Tutorial slides
     */
	slides = [{'id':'0','image': '/assets//slide0.png'},
		{'id':'1','image': '/assets//slide01.PNG','caption':'Login to Seed-Test via GitHub or create a new Seed-Test Account by registering.\nAlternatively you can try Seed-Test without an account, by trying our Demo.'},
		{'id':'2','image': '/assets//slide03.PNG','caption':'Else you can just register yourself using your E-Mail.'},
		{'id':'3','image': '/assets//slide04.PNG','caption':'After the first Login of your Seed-Test account, you can create your own custom Projects \nor connect an existing GitHub Account or Jira Server.'},
		{'id':'4','image': '/assets//slide05.PNG','caption':'Name your custom Project and save it.'},
		{'id':'5','image': '/assets//slide06.PNG','caption':'Select your newly created Project to continue.'},
		{'id':'6','image': '/assets//slide07.png','caption':'With a new Custom Project you can create your own stories.\nIf you use a Github or Jira repository, you have to create an issue with the tag or label „story“, to make it appear in Seed-Test.'},
		{'id':'7','image': '/assets//slide08.PNG','caption':'Enter a name and description for your new story.'},
		{'id':'8','image': '/assets//slide09.PNG','caption':'Now you can add steps to create your first Test!\nUsually you want to start by using the Given-Step: "Website".'},
		{'id':'9','image': '/assets//slide10.PNG','caption':'Run your Test by clickling on "Run Scenario".'},
		{'id':'10','image': '/assets//slide11.png','caption':'For help and further information click on Help and check out our Tutorial.'}];

	customOptions: OwlOptions = {
		loop: true,
		items: 1,
		stagePadding: -5, // negative value so that only one slide shows at a time
		autoplay: true,
		mouseDrag: false,
		touchDrag: false,
		pullDrag: false,
		center: true,
		dots: false,
		navSpeed: 1500, // speed of slide change, lower = faster
		navText: ['<em class="material-icons" id="carousel_arrow">arrow_back</em>', '<em class="material-icons" id="carousel_arrow">arrow_forward</em>'],
		nav: true,
		autoplaySpeed: 1500
	};


	/**
     * Constructor
     * @param loginService
     * @param apiService
     * @param router
     * @param route
     * @param cdr
     * @param themeService
     * @param projectServise
     */
	/** Handles GitHub OAuth callback code from query params */
	private readonly githubCallbackEffect = effect(() => {
		const params = this.queryParams();
		if (!params?.['code']) return;
		untracked(() => this.handleGithubCallback(params['code']));
	});

	constructor() {
		this.clientId = localStorage.getItem('clientId')!;
	}

	/** Processes GitHub OAuth callback — authenticates and optionally merges accounts */
	private handleGithubCallback(code: string) {
		this.loginService.githubCallback(code).subscribe((resp) => {
			if (resp.error)
				if (resp.status === 501)
					this.error.set('GitHub Integration has not been set up yet.');
				else
					this.error.set(this.defaultErrorMessage);
			else {
				localStorage.setItem('login', 'true');
				const mergeToken = localStorage.getItem('mergeToken');
				localStorage.removeItem('mergeToken');
				if (mergeToken) {
					// The callback logged in as the fresh GitHub-only account G. Merge its
					// verified identity into the Seed account that was authorized during
					// the initiate step (token proves ownership — no client-controlled userId).
					this.loginService.mergeAccountGithub(mergeToken).subscribe({
						next: () => this.getRepositories(),
						error: () => this.getRepositories()
					});
				} else {
					this.getRepositories();
				}
			}
		},
		(error) => {
			if (error.status === 501)
				this.error.set('GitHub Integration has not been set up yet.');
			else
				this.error.set(this.defaultErrorMessage);
		});
	}

	/**
     * Needed for ExpressionChangedAfterItHasBeenCheckedError mat-carousel error
     */
	ngAfterViewInit(): void {
		this.cdr.detectChanges();
	}

	/**
     * @ignore
     */
	ngOnInit() {
		// Removed unconditional auto-navigate to '/' when login= and repository are set.
		// Auto-navigation was the thrash loop trigger: it sent unauthenticated users into
		// the shell, which fired 401 fetches, storiesErrorEffect removed 'login', navigated
		// back to /login, ngOnInit saw login again, and the cycle repeated indefinitely.
		// The shell's storiesErrorEffect handles 401 -> /login redirection cleanly.
		// For users with valid sessions: no stale localStorage needed — backend cookie
		// is valid and fetches succeed. For invalid sessions: fetch fails, storiesErrorEffect
		// lands on /login without thrashing.
		// Still call getRepositories() when login=true but no repository selected
		// (user logged in but needs to pick a project). The getRepositories result
		// handles valid/empty repos via router.navigate to accountManagement or '/'.
		if (localStorage.getItem('login') && !localStorage.getItem('repository'))
			this.getRepositories();
	}


	/**
     * Loggs in the user with a Seed-Test account
     * @param form
     */
	async login(form: NgForm) {
		this.isLoadingRepositories.set(true);
		this.error.set(undefined);
		const user = {
			email: form.value.email,
			password: form.value.password,
			stayLoggedIn: form.value.stayLoggedIn
		};
		// CASE 1: Login succeeded — loginUser resolved a real user (has _id).
		// Only then may we mark the user as logged in and fetch repositories.
		// CASE 2: Login failed — loginUser emits null (login.service catches the error and
		// returns of(null)), so we must NOT set login=true. Doing so would make the app enter
		// the logged-in shell without a valid session and loop 401 requests until the backend
		// rate limiter blocks everything (see bootstrap effects in app.component/parent).
		this.loginService.loginUser(user).subscribe((loggedInUser) => {
			if (!loggedInUser) {
				this.error.set(this.defaultErrorMessage);
				this.isLoadingRepositories.set(false);
				return;
			}
			localStorage.setItem('login', 'true');
			this.isLoadingRepositories.set(false);
			this.getRepositories();
		});
	}
	/**
     * Retrieves the repositories / projects of the user
     */
	getRepositories() {
		let repoNotSet = false; 
		const repoName = localStorage.getItem('repository');
		const source = localStorage.getItem('source');
		const _id = localStorage.getItem('id');
		const repository: RepositoryContainer = {repoName: repoName!, source: source!, _id: _id!};
		this.isLoadingRepositories.set(true);
		const loadingSpinner: HTMLElement = document.getElementById('loadingSpinner')!;
		if (loadingSpinner) 
			loadingSpinner.scrollIntoView();
        
		this.projectServise.getRepositories().subscribe((resp: RepositoryContainer[]) => {
			if (resp.length <= 0) {
				console.log('repositories empty');
				this.router.navigate(['/accountManagement']);
			}
			resp.forEach((elem) => {
				if (elem.repoName == repository.repoName && elem.source == repository.source && elem._id == repository._id) {
					this.router.navigate(['']);
					repoNotSet = true;
				}
			});
			if (!repoNotSet)
				this.router.navigate(['/accountManagement']);
            
			this.repositories = resp;
			this.isLoadingRepositories.set(false);

		}, (_) => {
			this.error.set(this.defaultErrorMessage);
			this.isLoadingRepositories.set(false);
		});
	}

	/**
     * Loggs in the user with Github
     */
	githubLogin() {
		this.error.set(undefined);
		if (localStorage.getItem('clientId') === 'undefined') {
			this.error.set('GitHub Integration has not been set up yet.');
			return;
		}
		this.isLoadingRepositories.set(true);
		this.loginService.githubLogin();
	}

	onDark(): boolean {
		return localStorage.getItem('user-theme') === 'dark';
	}
}
