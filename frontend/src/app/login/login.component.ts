import {AfterViewInit, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Router, ActivatedRoute} from '@angular/router';
import {NgForm} from '@angular/forms';
import { RepositoryContainer } from '../model/RepositoryContainer';

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

    /**
     * Boolean to see if the repository is loading
     */
    isLoadingRepositories: boolean;

    /**
     * Tutorial slides
     */
    slide0 = [{'image0': '/assets//slide0.png'}];
    slide01 = [{'image01': '/assets//slide01.PNG'}];
    slide02 = [{'image02': '/assets//slide02.png'}];
    slide03 = [{'image03': '/assets//slide03.PNG'}];
    slide04 = [{'image04': '/assets//slide04.PNG'}];
    slide05 = [{'image05': '/assets//slide05.PNG'}];
    slide06 = [{'image06': '/assets//slide06.PNG'}];
    slide07 = [{'image07': '/assets//slide07.png'}];
    slide08 = [{'image08': '/assets//slide08.PNG'}];
    slide09 = [{'image09': '/assets//slide09.PNG'}];
    slide10 = [{'image10': '/assets//slide10.PNG'}];
    slide11 = [{'image11': '/assets//slide11.png'}];


    /**
     * Constructor
     * @param apiService 
     * @param router 
     * @param route 
     * @param cdr 
     */
    constructor(public apiService: ApiService, public router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
        this.error = undefined;
        this.route.queryParams.subscribe((params) => {
           if (params.code){
                this.apiService.githubCallback(params.code).subscribe(resp => {
                    if (resp.error){
                        this.error = resp.error
                    }else{
                        localStorage.setItem('login', 'true')
                        this.getRepositories()
                        let userId = localStorage.getItem('userId');
                        localStorage.removeItem('userId');
                        if(userId){
                            this.apiService.mergeAccountGithub(userId, resp.login, resp.id).subscribe((respo) => {
                                this.loginGithubToken(resp.login, resp.id);
                            })
                        }
                    }
                })
            }
        })
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
    }

    /**
     * Loggs in the user with github after retrieving the github token
     * @param login 
     * @param id 
     */
    loginGithubToken(login: string, id: any){
        this.apiService.loginGithubToken(login, id).subscribe((resp) => {
            if (resp.status === 'error') {
                this.error = resp.message;
            } else if (resp.message === 'repository') {
                let repository = resp.repository;
                localStorage.setItem('repositoryType', 'github');
                localStorage.setItem('repository', repository);
                this.isLoadingRepositories = false;
                this.router.navigate(['/']);
            } else {
                this.getRepositories()
            }
        })
    }

    /**
     * Loggs in the user with a Seed-Test account
     * @param form 
     */
    async login(form: NgForm) {
        this.isLoadingRepositories = true;
        this.error = undefined;
        let user ={
            email: form.value.email,
            password: form.value.password,
            stayLoggedIn: form.value.stayLoggedIn
        };
        // const response = await 
        this.apiService.loginUser(user).subscribe(resp =>{
            localStorage.setItem('login', 'true');
            //this.apiService.updateRepositoryEmitter();
            this.getRepositories();
        })
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
        localStorage.setItem('repository', 'adessoCucumber/Cucumber')
        localStorage.setItem('source', 'github')
        this.router.navigate(['/testaccount']);
    }

    /**
     * Retrieves the repositories / projects of the user
     */
     getRepositories() {
        let value = localStorage.getItem('repository')
        let source = localStorage.getItem('source')
        let _id = localStorage.getItem('id');
        let repository: RepositoryContainer = {value, source, _id}
        this.isLoadingRepositories = true;
        const loadingSpinner: HTMLElement = document.getElementById('loadingSpinner');
        if (loadingSpinner){
            loadingSpinner.scrollIntoView();
        }
        this.apiService.getRepositories().subscribe((resp: RepositoryContainer[]) => {
            if(resp.length <= 0){
                console.log('repositories empty')
                this.router.navigate(['/accountManagement'])
            }
            resp.forEach((elem) => {
                if(elem.value == repository.value && elem.source == repository.source && elem._id == repository._id){
                    this.router.navigate(['']);
            }})
            this.repositories = resp;
            this.isLoadingRepositories = false;
            setTimeout(() => {
                const repositoriesList: HTMLElement = document.getElementById('repositoriesList');
                if (repositoriesList){
                    repositoriesList.scrollIntoView();
                }
            }, 500)

        }, (err) => {
            this.error = err.error;
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
        localStorage.setItem('repository', userRepository.value)
        localStorage.setItem('source', userRepository.source)
        localStorage.setItem('id', userRepository._id)
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
}
