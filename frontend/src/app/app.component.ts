import { Component, OnInit } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router } from '@angular/router';
import { RepositoryContainer } from './model/RepositoryContainer';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  githubName: string;
  title = 'cucumber-frontend';
  repositories: RepositoryContainer[];
  githubRepo: string[];
  jiraProject: string[];
  repository: string;
  showImpressum: boolean = false;
  showTerms: boolean = false;
  jirakeys: any;
  error: string;

  constructor(public apiService: ApiService, public router: Router) {
    this.apiService.getRepositoriesEvent.subscribe((repositories) => {
      this.repositories = repositories;
    });
  }

  ngOnInit() {
    this.getRepositories();
    if(!this.apiService.urlReceived) {
      this.apiService.getBackendInfo()
    }
    //this.apiService.local = localStorage.getItem('clientId') === localStorage.getItem('clientId_local')
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
    console.log('get Repositories');
    if (this.apiService.isLoggedIn() && (typeof this.repositories === 'undefined' || this.repositories.length <= 0)) {
      this.apiService.getRepositories().subscribe((resp) => {
        this.repositories = resp;
        console.log('repositories', this.repositories);
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

  onLocal(){
    if(this.apiService.local){
      let url_backend_daisy = localStorage.getItem('url_backend_daisy')
      let clientId_daisy = localStorage.getItem('clientId_daisy')
      localStorage.setItem('url_backend', url_backend_daisy);
      localStorage.setItem('clientId', clientId_daisy);
      this.apiService.local = false;
    }else{
      let url_backend = localStorage.getItem('url_backend_local')
      let clientId = localStorage.getItem('clientId_local')
      localStorage.setItem('url_backend', url_backend);
      localStorage.setItem('clientId', clientId);
      this.apiService.local = true;
    }
  }


  selectRepository(userRepository: RepositoryContainer) {
    const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
    ref.href = 'https://github.com/' + userRepository.value;
    localStorage.setItem('repository', userRepository.value)
    localStorage.setItem('source', userRepository.source)
    if(this.router.url !== '/'){
      this.router.navigate(['']);
    } else {
      this.apiService.getStories(userRepository).subscribe((resp) => {
      });
    }
  }

  manageAccount() {
    this.router.navigate(['/accountManagement']);
  }

  logout() {
    this.repositories = undefined;
    this.apiService.logoutUser().subscribe(resp => {
    });
    this.router.navigate(['/login']);
  }
}
