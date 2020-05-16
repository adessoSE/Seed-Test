import {Component, OnInit} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Router, ActivatedRoute} from '@angular/router';
import {NgForm} from '@angular/forms';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    repositories: string[];
    jirakeys: string[];
    error: string;
    private testJiraHost = '';
    repositoriesLoading: boolean;

    constructor(public apiService: ApiService, public router: Router, private route: ActivatedRoute) {
        this.route.queryParams.subscribe((params) => {
            if (params.login) {
                let userId = localStorage.getItem('userId');
                localStorage.removeItem('userId')
                if (userId){
                   this.apiService.mergeAccountGithub(userId, params.login, params.id).subscribe((resp) => {
                       this.loginGithubToken(params.login, params.id);
                   });
                } else {
                    this.loginGithubToken(params.login, params.id);
                }
            }
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
        //localStorage.setItem('email', form.value.email)
        this.repositoriesLoading = true;
        this.error = undefined;
        let response = await this.apiService.loginUser(form.value.email, form.value.password).toPromise()
        if (response.status === 'error') {
            this.repositoriesLoading = false;
            this.error = response.message;
        } else if (response.message === 'repository') {
            let repository = response.repository;
            localStorage.setItem('repositoryType', 'github');
            localStorage.setItem('repository', repository);
            this.router.navigate(['/']);
        } else {
            this.getRepositories()
        }
    }

    async loginTestAccount() {
        this.router.navigate(['/testaccount']);
    }

    getRepositories() {
        this.repositoriesLoading = true;
        let tmp_repositories = [];
        this.apiService.getRepositories().subscribe((resp) => {
            tmp_repositories = resp;
            localStorage.setItem('githubCount', `${tmp_repositories.length}`);
            this.apiService.getProjectsFromJira().subscribe((resp2) => {
                this.repositoriesLoading = false;
                this.repositories = tmp_repositories.concat(this.filterProjects(resp2));
                if(this.repositories.length <= 0){
                    console.log('repositories empty')
                    this.router.navigate(['/accountManagment'])
                }
                localStorage.setItem('jiraHost', this.testJiraHost);
            }, (err) => {
                this.repositoriesLoading = false;
                this.error = err.error;
                this.repositories = tmp_repositories;
            });
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

    selectRepository(userRepository: string) {
        const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
        ref.href = 'https://github.com/' + userRepository;
        const index = this.repositories.findIndex(name => name === userRepository) - Number(localStorage.getItem('githubCount'));
        if (index < 0) {
            localStorage.setItem('repositoryType', 'github');
        } else {
            localStorage.setItem('repositoryType', 'jira');
            localStorage.setItem('jiraKey', this.jirakeys[index]);
        }
        localStorage.setItem('repository', userRepository);
        this.router.navigate(['/']);
    }

    githubLogin() {
        this.repositoriesLoading = true;
        this.apiService.githubAuthentication();
    }
}
