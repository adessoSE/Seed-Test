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
  repository: string;
  showImpressum: boolean = false;
  showTerms: boolean = false;

  constructor(public apiService: ApiService, public router: Router) {
    this.apiService.getRepositoriesEvent.subscribe((resp: string[]) => {
      console.log('repositories Event')
      this.repositories = resp;
    })
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
    if(this.apiService.isLoggedIn() && (typeof this.repositories === 'undefined' || this.repositories.length > 0)){
      this.apiService.getRepositories().subscribe((resp: any) => {
          this.repositories = resp;
          console.log(resp)
      });
    }
  }


  selectRepository(repository: string) {
    const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
    ref.href = 'https://github.com/' + repository;
    localStorage.setItem('repository', repository);
    this.repository = repository;
    this.apiService.getStories(repository).subscribe(resp => {
    });
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
