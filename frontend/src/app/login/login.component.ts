import {AfterViewInit, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Router, ActivatedRoute} from '@angular/router';
import {NgForm} from '@angular/forms';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { ThemingService } from '../Services/theming.service';
import { Subscription } from 'rxjs';
import { OwlOptions } from 'ngx-owl-carousel-o';

/**
 * Component to handle the client login
 */
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {

    /**
     * Repositories / projects of the user
     */
    repositories: RepositoryContainer[];

    /**
     * Login error
     */
    error: string;
    defaultErrorMessage = 'Login Failed: Wrong Username Or Password';

    /**
     * Boolean to see if the repository is loading
     */
    isLoadingRepositories: boolean;

    currentTheme: String;

    isDark: boolean;

    /**
     * Subscribtions for all EventEmitter
     */
    themeObservable: Subscription;
    routeObservable: Subscription;

    /**
     * Tutorial slides
     */
    slides = [{'id': '0', 'image': '/assets//slide0.png'},
            {'id': '1', 'image': '/assets//slide01.PNG', 'caption': 'Login to Seed-Test via GitHub or create a new Seed-Test Account by registering.\nAlternatively you can try Seed-Test without an account, by trying our Demo.'},
            {'id': '2', 'image': '/assets//slide02.png', 'caption': 'After the login via GitHub you can see your repositories.'},
            {'id': '3', 'image': '/assets//slide03.PNG', 'caption': 'Else you can just register yourself using your E-Mail.'},
            {'id': '4', 'image': '/assets//slide04.PNG', 'caption': 'After the first Login of your Seed-Test account, you can create your own custom Repositories \nor connect an existing GitHub Account or Jira Server.'},
            {'id': '5', 'image': '/assets//slide05.PNG', 'caption': 'Name your custom Project and save it.'},
            {'id': '6', 'image': '/assets//slide06.PNG', 'caption': 'Select your newly created Project to continue.'},
            {'id': '7', 'image': '/assets//slide07.png', 'caption': 'With a new Custom Project you can create your own stories.\nIf you use a Github or Jira repository, you have to create an issue with the tag or label „story“, to make it appear in Seed-Test.'},
            {'id': '8', 'image': '/assets//slide08.PNG', 'caption': 'Enter a name and description for your new story.'},
            {'id': '9', 'image': '/assets//slide09.PNG', 'caption': 'Now you can add steps to create your first Test!\nUsually you want to start by using the Given-Step: "Website".'},
            {'id': '10', 'image': '/assets//slide10.PNG', 'caption': 'Run your Test by clickling on "Run Scenario".'},
            {'id': '11', 'image': '/assets//slide11.png', 'caption': 'For help and further information click on Help and check out our Tutorial.'}];

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
     * @param apiService
     * @param router
     * @param route
     * @param cdr
     * @param themeService
     */
    constructor(public apiService: ApiService, public router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef,
            public themeService: ThemingService) {
        this.error = undefined;
        this.routeObservable = this.route.queryParams.subscribe((params) => {
           if (params.code) {
                this.apiService.githubCallback(params.code).subscribe(resp => {
                    if (resp.error) {
                        this.error = this.defaultErrorMessage; // resp.error
                    } else {
                        localStorage.setItem('login', 'true');
                        this.getRepositories();
                        const userId = localStorage.getItem('userId');
                        localStorage.removeItem('userId');
                        if (userId) {
                            this.apiService.mergeAccountGithub(userId, resp.login, resp.id).subscribe((respo) => {
                                this.loginGithubToken(resp.login, resp.id);
                            });
                        }
                    }
                });
            }
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
        this.isDark = this.themeService.isDarkMode();
        this.themeObservable = this.themeService.themeChanged.subscribe((currentTheme) => {
            this.isDark = this.themeService.isDarkMode();
        });
    }

    ngOnDestroy() {
        if (!this.themeObservable.closed) {
            this.themeObservable.unsubscribe();
        }
        if (!this.routeObservable.closed) {
            this.routeObservable.unsubscribe();
        }
    }

    /**
     * Loggs in the user with github after retrieving the github token
     * @param login
     * @param id
     */
    loginGithubToken(login: string, id: any) {
        this.apiService.loginGithubToken(login, id).subscribe((resp) => {
            if (resp.status === 'error') {
                this.error = this.defaultErrorMessage;
            } else if (resp.message === 'repository') {
                const repository = resp.repository;
                localStorage.setItem('repositoryType', 'github');
                localStorage.setItem('repository', repository);
                this.isLoadingRepositories = false;
                this.router.navigate(['/']);
            } else {
                this.getRepositories();
            }
        });
    }

    /**
     * Loggs in the user with a Seed-Test account
     * @param form
     */
    async login(form: NgForm) {
        this.isLoadingRepositories = true;
        this.error = undefined;
        const user = {
            email: form.value.email,
            password: form.value.password,
            stayLoggedIn: form.value.stayLoggedIn
        };
        // const response = await
        this.apiService.loginUser(user).subscribe(resp => {
            localStorage.setItem('login', 'true');
            // this.apiService.updateRepositoryEmitter();
            this.getRepositories();
        });
        // if (response.status === 'error') {
        //     this.isLoadingRepositories = false;
        //     this.error = response.message;
        // } else {
        //     localStorage.setItem('login', 'true');
        //     this.getRepositories();
        // }
    }


    /**
     * Redirects the user to the Test account
     */
    async loginTestAccount() {
        localStorage.setItem('repository', 'adessoCucumber/Cucumber');
        localStorage.setItem('source', 'github');
        this.router.navigate(['/testaccount']);
    }

    /**
     * Retrieves the repositories / projects of the user
     */
     getRepositories() {
        const value = localStorage.getItem('repository');
        const source = localStorage.getItem('source');
        const _id = localStorage.getItem('id');
        const repository: RepositoryContainer = {value, source, _id};
        this.isLoadingRepositories = true;
        const loadingSpinner: HTMLElement = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.scrollIntoView();
        }
        this.apiService.getRepositories().subscribe((resp: RepositoryContainer[]) => {
            if (resp.length <= 0) {
                console.log('repositories empty');
                this.router.navigate(['/accountManagement']);
            }
            resp.forEach((elem) => {
                if (elem.value == repository.value && elem.source == repository.source && elem._id == repository._id) {
                    this.router.navigate(['']);
            }});
            this.repositories = resp;
            this.isLoadingRepositories = false;
            setTimeout(() => {
                const repositoriesList: HTMLElement = document.getElementById('repositoriesList');
                if (repositoriesList) {
                    repositoriesList.scrollIntoView();
                }
            }, 500);

        }, (err) => {
            this.error = this.defaultErrorMessage;
            this.isLoadingRepositories = false;
        });
    }

    /**
     * Selects a repository and redirects the user to the story editor
     * @param userRepository selected repository
     */
    selectRepository(userRepository: RepositoryContainer) {
        const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
        ref.href = 'https://github.com/' + userRepository.value;
        localStorage.setItem('repository', userRepository.value);
        localStorage.setItem('source', userRepository.source);
        localStorage.setItem('id', userRepository._id);
        this.router.navigate(['']);
    }

    /**
     * Loggs in the user with Github
     */
    githubLogin() {
        this.error = undefined;
        this.isLoadingRepositories = true;
        this.apiService.githubLogin();
    }

      onDark(): boolean {
        return localStorage.getItem('user-theme') === 'dark';
      }
}
