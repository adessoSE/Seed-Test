import {Component, OnInit} from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm} from '@angular/forms';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    repositories: string[];
    jirakeys: string[];
    error: string;
    private testAccountName = 'adessoCucumber';
    private testAccountToken: string;
    private testJiraHost = '';

  constructor(public apiService: ApiService, public router: Router, private route: ActivatedRoute) {
        this.route.queryParams.subscribe((params) => {
          if(params.login){
            this.apiService.loginGihubToken(params.login, params.id).subscribe((resp) => {
              if(resp.status === 'error'){
                this.error = resp.message;
              } else if(resp.message === 'repository') {
                let repository = resp.repository;
                localStorage.setItem('repositoryType', 'github');
                localStorage.setItem('repository', repository);
                this.router.navigate(['/']);
              }else{
                this.getRepositories()
              }
            })
          }
        })
    }

    ngOnInit() {
    }

  async login(form: NgForm) {
    this.error = undefined;
    let response = await this.apiService.loginUser(form.value.email, form.value.password).toPromise()
    console.log('response: ' + JSON.stringify(response))
    if(response.status === 'error'){
      this.error = response.message;
    } else if(response.message === 'repository') {
      let repository = response.repository;
      localStorage.setItem('repositoryType', 'github');
      localStorage.setItem('repository', repository);
      this.router.navigate(['/']);
    }else{
      this.getRepositories()
    }
  }

  async loginTestAccount() {
    this.router.navigate(['/testaccount']);
  }

  getRepositories() {
    let tmp_repositories = [];
    this.apiService.getRepositories().subscribe((resp) => {
      tmp_repositories = resp;
      localStorage.setItem('token', this.testAccountToken);
      localStorage.setItem('githubName', this.testAccountName);
      localStorage.setItem('githubCount', `${tmp_repositories.length}`);
      if (this.testJiraHost.length > 0) {
          this.apiService.getProjectsFromJira(this.testJiraHost).subscribe((resp2) => {
              this.repositories = tmp_repositories.concat(this.filterProjects(resp2));
              localStorage.setItem('jiraHost', this.testJiraHost);
          }, (err) => {
              this.error = err.error;
              this.repositories = tmp_repositories;
          });
      } else {
          this.repositories = tmp_repositories;
      }
  }, (err) => {
      this.error = err.error;
  });
  }

    filterProjects(resp) {
        let projectNames = [];
        let projectKeys = [];
        JSON.parse(resp)['projects'].forEach(entry => {
            projectNames = projectNames.concat(`${localStorage.getItem('jiraHost')}/${entry['name']}`);
            projectKeys = projectKeys.concat(`${entry['key']}`);
        });
        this.jirakeys = projectKeys;
        console.log(this.jirakeys);
        return projectNames;
    }

  selectRepository(userRepository: string) {
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

  githubLogin(){
    this.apiService.githubAuthentication()
 }
}
