import { Component, EventEmitter, HostBinding, OnInit, Output } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router } from '@angular/router';
import { RepositoryContainer } from './model/RepositoryContainer';
import { ThemingService } from './Services/theming.service';
import { FormControl } from '@angular/forms';


/**
 * Master Component
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  /**
   * Currently retrieved projects
   */
  repositories: RepositoryContainer[];

  /**
   * If the impressum is shown
   */
  showImpressum: boolean = false;

  /**
   * If the terms are shown
   */
  showTerms: boolean = false;

  /**
   * Error during retrieving the projects
   */
  error: string;

  isDark : boolean;

 /*  @HostBinding('class') className = '';  */

  toggleControl = new FormControl(false);

  
  /**
   * Constructor
   * @param apiService 
   * @param router 
   * @param themeService
   */
  constructor(public apiService: ApiService, public router: Router, public themeService: ThemingService) {
    /*this.apiService.getRepositoriesEvent.subscribe((repositories) => {
      this.repositories = repositories;
      sessionStorage.setItem('repositories', JSON.stringify(repositories))
    });*/
    this.apiService.logoutEvent.subscribe(_ => {
      this.logout();
  });
    this.apiService.updateRepositoryEvent.subscribe(() => this.getRepositories())
  }

  /**
   * Retrieves Repositories
   */
  ngOnInit() {
    this.getRepositories();
    if (!this.apiService.urlReceived) {
      this.apiService.getBackendInfo();
    }
    this.themeService.loadTheme();
    this.isDark = this.themeService.isDarkMode();
    if (this.isDark) {
      this.toggleControl.setValue(this.isDark);
    }
    this.toggleControl.valueChanges.subscribe(val => {
      this.setModeOnToggle(val);
      this.isDark = val;
      /* this.className = val ? 'darkTheme' : ''; */
    });
  }

  /**
   * Opens the terms section
   */
  openTerms(){
    this.showImpressum = false;
    this.showTerms = !this.showTerms;
    if(this.showTerms) {
      const footer: HTMLElement = document.getElementById('footer');
      footer.scrollIntoView();
    }
  }

  /**
   * Opens the impressum section
   */
  openImpressum() {
    this.showTerms = false;
    this.showImpressum = !this.showImpressum;
    if(this.showImpressum) {
      const footer: HTMLElement = document.getElementById('footer');
      footer.scrollIntoView();
    }
  }

  /**
   * Gets the repositories
   */
  getRepositories() {
    if (this.apiService.isLoggedIn()) {
      this.apiService.getRepositories().subscribe((resp) => {
        this.repositories = resp;
        sessionStorage.setItem('repositories', JSON.stringify(resp));
      }, (err) => {
        this.error = err.error;
      });
    }
  }

  /**
   * Selects a project from the project list
   * @param userRepository
   */
  selectRepository(userRepository: RepositoryContainer) {
    const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
    ref.href = 'https://github.com/' + userRepository.value;
    localStorage.setItem('repository', userRepository.value);
    localStorage.setItem('source', userRepository.source);
    localStorage.setItem('id', userRepository._id);
    if(this.router.url !== '/') {
      this.router.navigate(['']);
    } else {
      window.location.reload();
    }
  }

  /**
   * Loggs out the user and redirects it to the login page
   */
  logout() {
    this.repositories = undefined;
    this.apiService.logoutUser().subscribe(resp => {
    });
    this.router.navigate(['/login']);
  }  

  setModeOnToggle(isDark:boolean) {
    this.themeService.setNewTheme(isDark);
  } 
}
