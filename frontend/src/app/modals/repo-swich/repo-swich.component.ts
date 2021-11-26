import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-repo-swich',
  templateUrl: './repo-swich.component.html',
  styleUrls: ['./repo-swich.component.css']
})
export class RepoSwichComponent implements OnInit {

  repos : RepositoryContainer[];

  filteredRepos: MatTableDataSource<RepositoryContainer>;

  displayedColumnsRepos: string[] = ['repository'];


  @ViewChild("repoSwitch") repoSwitch: RepoSwichComponent;

  constructor(private modalService: NgbModal, apiService: ApiService) {
    let currentRepo = localStorage.getItem('repository')
    apiService.getRepositories().subscribe((repositories) => {
      this.repos = repositories.filter(repo => repo.value!=currentRepo);
      this.filteredRepos = new MatTableDataSource(this.repos);
    });
  }

  ngOnInit(): void {
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
    location.reload()
  }

}
