import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router } from '@angular/router';
import { RepositoryContainer } from './model/RepositoryContainer';
import { ThemingService } from './Services/theming.service';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LoginService } from './Services/login.service';
import { ProjectService } from './Services/project.service';
import { StoryService } from './Services/story.service';


/**
 * Master Component
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{

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

  @ViewChild('dropdownMenu') dropdownMenu: ElementRef;
  @ViewChild('helpMenu') helpMenu: ElementRef;

  closed: boolean = false;
  helpPosition: any;
  menuPosition: any;

  isDark : boolean;

  toggleControl = new FormControl(false);

  /**
  * Subscribtions for all EventEmitter
  */
  logoutObservable: Subscription;
  getRepositoriesObservable: Subscription;
  updateRepositoryObservable: Subscription;
  toggleObservable: Subscription;
  createRepositoryEmitter: Subscription;


  /**
   * Constructor
   * @param apiService
   * @param router
   * @param themeService
   * @param loginService
   * @param projectService
   * @param storyService
   */

  constructor(public apiService: ApiService, 
    public router: Router, 
    public themeService: ThemingService,
    public loginService: LoginService,
    public projectService: ProjectService,
    public storyService: StoryService,
    ) {
  }

  /**
   * Retrieves Repositories
   */
  ngOnInit() {
    this.logoutObservable = this.loginService.logoutEvent.subscribe(_ => {
      this.logout();
    });
    this.getRepositoriesObservable = this.projectService.getRepositoriesEvent.subscribe(() => this.getRepositories())
    this.updateRepositoryObservable = this.projectService.updateRepositoryEvent.subscribe(() => this.updateRepositories())
    
    this.createRepositoryEmitter = this.storyService.createCustomStoryEmitter.subscribe(custom => {
      this.projectService.createRepository(custom.repository.value, custom.repository._id).subscribe(_ => {
          this.getRepositories()
        });
    });
    if (!this.apiService.urlReceived) {
      this.apiService.getBackendInfo();
    }
    this.themeService.loadTheme();
    this.isDark = this.themeService.isDarkMode();
    if (this.isDark) {
      this.toggleControl.setValue(this.isDark);
    }
    this.toggleObservable = this.toggleControl.valueChanges.subscribe(val => {
      this.setModeOnToggle(val);
      this.isDark = val;
    });

  }

  ngOnDestroy(){
    if(!this.logoutObservable.closed){
      this.logoutObservable.unsubscribe();
    }
    if(!this.getRepositoriesObservable.closed){
      this.getRepositoriesObservable.unsubscribe();
    }
    if(!this.updateRepositoryObservable.closed){
      this.updateRepositoryObservable.unsubscribe();
    }
    if(!this.toggleObservable.closed){
      this.toggleObservable.unsubscribe();
    }
  }

  ngAfterViewInit(){
    this.helpPosition = this.dropdownMenu.nativeElement.offsetTop;
    this.menuPosition = this.helpMenu.nativeElement.offsetTop;

  }

  @HostListener('window:scroll', ['$event'])
    handleScroll() {
      const windowScroll = window.scrollY;
      if (windowScroll > this.helpPosition) {
        this.closed = true;
      } else {
        this.closed = false;
      }
    }

  /**
   * Opens the terms section
   */
  openTerms() {
    this.showImpressum = false;
    this.showTerms = !this.showTerms;
    if (this.showTerms) {
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
    if (this.loginService.isLoggedIn()) {
      this.projectService.getRepositories().subscribe((resp) => {
        this.repositories = resp;
      }, (err) => {
        this.error = err.error;
      });
    }
  }

   /**
     * Update Repositories after change
     */
    updateRepositories() {
      //this.apiService.getRepositories().subscribe((repositories) => {this.seperateRepos(repositories)});
      const value = sessionStorage.getItem('repositories');
      let repository: RepositoryContainer[] = JSON.parse(value);
      this.repositories = repository;
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
    this.loginService.logoutUser().subscribe(_ => {
      //
    });
    this.router.navigate(['/login']);
  }

  setModeOnToggle(isDark: boolean) {
    this.themeService.setNewTheme(isDark);
  }
}
