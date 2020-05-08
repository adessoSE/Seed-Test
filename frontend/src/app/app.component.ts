import { Component, OnInit } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  token: string;
  githubName: string;
  title = 'cucumber-frontend';
  repositories: string[];
  githubRepo: string[];
  jiraProject: string[];
  repository: string;
  showImpressum: boolean = false;
  showTerms: boolean = false;
  jirakeys: any;
  error: string;

  constructor(public apiService: ApiService, public router: Router) {
    this.apiService.getProjectsEvent.subscribe((resp: string[]) => {
      console.log('repositories Event');
      this.jiraProject = this.filterProjects(resp);
      if (typeof this.githubRepo !== 'undefined') {
          this.repositories = this.githubRepo.concat(this.jiraProject);
      } else {
          this.repositories = this.jiraProject;
      }
    });
    this.apiService.getRepositoriesEvent.subscribe((resp: string[]) => {
      console.log('repositories Event');
      this.githubRepo = resp;
      if (typeof this.jiraProject !== 'undefined') {
        this.repositories = this.githubRepo.concat(this.jiraProject);
      } else {
        this.repositories = this.githubRepo;
      }
    });
  }

  ngOnInit() {
    this.getRepositories();
    if(!this.apiService.urlReceived) {
      this.apiService.getBackendInfo()
    }
  }

  openTerms(){
    this.showImpressum = false;
    this.showTerms = !this.showTerms;
    if(this.showTerms) {
      const footer: HTMLElement = document.getElementById('footer');
      footer.scrollIntoView();
    }
  }

  openImpressum(){
    this.showTerms = false;
    this.showImpressum = !this.showImpressum;
    if(this.showImpressum) {
      const footer: HTMLElement = document.getElementById('footer');
      footer.scrollIntoView();
    }
  }

  getRepositories() {
    let tmp_repositories = [];
    if (this.apiService.isLoggedIn() && (typeof this.repositories === 'undefined' || this.repositories.length > 0)) {
      this.apiService.getRepositories().subscribe((resp) => {
        tmp_repositories = resp;
        localStorage.setItem('githubCount', `${tmp_repositories.length}`);
        this.apiService.getProjectsFromJira().subscribe((resp2) => {
          this.repositories = tmp_repositories.concat(this.filterProjects(resp2));
        }, (err) => {
          this.error = err.error;
          this.repositories = tmp_repositories;
        });
      }, (err) => {
        this.error = err.error;
      });
    }
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

  manageAccount() {
    this.router.navigate(['/accountManagment']);
  }

  logout() {
    this.repositories = undefined;
    this.apiService.logoutUser().subscribe(resp => {
      this.router.navigate(['/login']);
    });
  }
}
