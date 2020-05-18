import {Component, OnInit} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Router, ActivatedRoute} from '@angular/router';
import {NgForm} from '@angular/forms';
import { RepositoryContainer } from '../model/RepositoryContainer';

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
                this.repositoriesLoading = false;
                let obj = {value: repository.value, source: repository.source}
                this.router.navigate(['main', obj]);
            } else {
                this.getRepositories()
            }
        })
    }

    async login(form: NgForm) {
        this.repositoriesLoading = true;
        this.error = undefined;
        let response = await this.apiService.loginUser(form.value.email, form.value.password).toPromise()
        if (response.status === 'error') {
            this.repositoriesLoading = false;
            this.error = response.message;
        } else if (response.message === 'repository') {
            let repository = response.repository;
            let obj = {value: repository.value, source: repository.source}
            this.router.navigate(['main', obj]);
        } else {
            this.getRepositories()
        }
    }

    async loginTestAccount() {
        this.router.navigate(['/testaccount']);
    }

    getRepositories() {
        this.repositoriesLoading = true;
        this.apiService.getRepositories().subscribe((resp) => {
            console.log(resp)
            this.repositories = resp;
            this.repositoriesLoading = false;
            if(this.repositories.length <= 0){
                console.log('repositories empty')
                this.router.navigate(['/accountManagment'])
            }
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
        this.router.navigate(['main', userRepository]);
    }

    githubLogin() {
        this.repositoriesLoading = true;
        this.apiService.githubAuthentication();
    }
}
