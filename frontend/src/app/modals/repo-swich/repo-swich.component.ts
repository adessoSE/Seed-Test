import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-repo-swich',
  templateUrl: './repo-swich.component.html',
  styleUrls: ['./repo-swich.component.css',  '../layout-modal/layout-modal.component.css']
})
export class RepoSwichComponent implements OnInit {

  repos: RepositoryContainer[];

  filteredRepos: MatTableDataSource<RepositoryContainer>;

  displayedColumnsRepos: string[] = ['repository'];

  currentRepo;

  updateRepositoryObservable: Subscription;

  @ViewChild('repoSwitch') repoSwitch: RepoSwichComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService) {
    this.currentRepo = localStorage.getItem('repository');

    const value = sessionStorage.getItem('repositories');
    const repositories: RepositoryContainer[] = JSON.parse(value);
    this.repos = repositories.filter(repo => repo.value != this.currentRepo);
    this.filteredRepos = new MatTableDataSource(this.repos);
  }

  ngOnInit(): void {
    this.updateRepositoryObservable = this.apiService.updateRepositoryEvent.subscribe(() => {
      this.updateRepos();
    });
  }

  ngOnDestroy() {
    if (!this.updateRepositoryObservable.closed) {
      this.updateRepositoryObservable.unsubscribe();
    }
  }

  openModal() {
    this.modalService.open(this.repoSwitch, {ariaLabelledBy: 'modal-basic-titles'});
  }

   /**
   * Filters reporitories for searchterm
   */
  searchOnKey(filter: string) {
    this.filteredRepos.filterPredicate =  (data: RepositoryContainer, repoFilter: string) => data.value.trim().toLowerCase().indexOf(repoFilter) != -1;
    /* Apply filter */
    this.filteredRepos.filter = filter.trim().toLowerCase();
  }

  /**
     * Selects the repository and redirects the user to the story editor
     * @param userRepository
     */
  selectRepository(userRepository: RepositoryContainer) {
    const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
    ref.href = 'https://github.com/' + userRepository.value;
    localStorage.setItem('repository', userRepository.value);
    localStorage.setItem('source', userRepository.source);
    localStorage.setItem('id', userRepository._id);
    location.reload();
  }

  /**
     * Update Repositories after change
     */
  updateRepos() {
    const value = sessionStorage.getItem('repositories');
    const repositories: RepositoryContainer[] = JSON.parse(value);
    this.repos = repositories.filter(repo => repo.value != this.currentRepo);
    this.filteredRepos = new MatTableDataSource(this.repos);
  }
}
