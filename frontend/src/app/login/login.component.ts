import {AfterViewInit, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Router, ActivatedRoute} from '@angular/router';
import {NgForm} from '@angular/forms';
import { RepositoryContainer } from '../model/RepositoryContainer';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {

    repositories: RepositoryContainer[];
    jirakeys: string[];
    error: string;
    private testJiraHost = '';
    repositoriesLoading: boolean;
    showInstruction = false;
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
    ngAfterViewInit(): void {
        // needed for ExpressionChangedAfterItHasBeenCheckedError mat-carousel error
        this.cdr.detectChanges();
    }

    getGithubData (accessToken){
        fetch(`https://api.github.com/user?access_token=${accessToken}`,
            {
                method:"GET",
                headers: {
                    "User-Agent": "SampleOAuth",
                }
            }).then(async function (resp) {
                //console.log(resp)
            })
                
      }

    ngOnInit() {
    }

    loginGithubToken(login: string, id: any){
        this.apiService.loginGithubToken(login, id).subscribe((resp) => {
            if (resp.status === 'error') {
                this.error = resp.message;
            } else if (resp.message === 'repository') {
                let repository = resp.repository;
                localStorage.setItem('repositoryType', 'github');
                localStorage.setItem('repository', repository);
                this.repositoriesLoading = false;
                this.router.navigate(['/']);
            } else {
                this.getRepositories()
            }
        })
    }

    async login(form: NgForm) {
        this.repositoriesLoading = true;
        this.error = undefined;
        const response = await this.apiService.loginUser(form.value.email, form.value.password, form.value.stayLoggedIn).toPromise()
        if (response.status === 'error') {
            this.repositoriesLoading = false;
            this.error = response.message;
        } else {
            localStorage.setItem('login', 'true');
            this.getRepositories();
        }
    }

    async loginTestAccount() {
        this.router.navigate(['/testaccount']);
    }

    getRepositories() {
        let value = localStorage.getItem('repository')
        let source = localStorage.getItem('source')
        let repository: RepositoryContainer = {value, source}
        this.repositoriesLoading = true;
        const loadingSpinner: HTMLElement = document.getElementById('loadingSpinner');
        if (loadingSpinner){
            loadingSpinner.scrollIntoView();
        }
        this.apiService.getRepositories().subscribe((resp: RepositoryContainer[]) => {
            console.log(resp)
            if(resp.length <= 0){
                console.log('repositories empty')
                this.router.navigate(['/accountManagement'])
            }
            resp.forEach((elem) => {
                if(elem.value == repository.value && elem.source == repository.source){
                    this.router.navigate(['']);
                }
            })
            this.repositories = resp;
            this.repositoriesLoading = false;
            setTimeout(() => {
                const repositoriesList: HTMLElement = document.getElementById('repositoriesList');
                if (repositoriesList){
                    repositoriesList.scrollIntoView();
                }
            }, 500)

        }, (err) => {
            this.error = err.error;
            this.repositoriesLoading = false;
        });
    }

    filterProjects(resp) {
        try{
            let projectNames = [];
            let projectKeys = [];
            JSON.parse(resp)['projects'].forEach(entry => {
                projectNames = projectNames.concat(`jira/${entry['name']}`);
                projectKeys = projectKeys.concat(`${entry['key']}`);
            });
            this.jirakeys = projectKeys;
            console.log(this.jirakeys);
            return projectNames;
        }catch(error) {
            return []
        }
    }

    selectRepository(userRepository: RepositoryContainer) {
        const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
        ref.href = 'https://github.com/' + userRepository.value;
        localStorage.setItem('repository', userRepository.value)
        localStorage.setItem('source', userRepository.source)
        this.router.navigate(['']);
    }

    navToRegistration() {
        this.router.navigate(['/register']);
    }

    githubLogin() {
        this.error = undefined;
        this.repositoriesLoading = true;
        this.apiService.githubLogin();
    }

    openInstruction() {
        this.showInstruction = !this.showInstruction;
    }

    resetPassword() {
        this.router.navigate(['/resetpassword']);
    }
}
