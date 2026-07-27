import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, viewChild } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { ProjectService } from 'src/app/Services/project.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-repo-swich',
    templateUrl: './repo-swich.component.html',
    styleUrls: ['./repo-swich.component.css', '../layout-modal/layout-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [LayoutModalComponent, FormsModule, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow]
})
export class RepoSwichComponent implements OnInit, OnDestroy {
	private modalService = inject(NgbModal);
	projectService = inject(ProjectService);


	repos: RepositoryContainer[];

	filteredRepos: MatTableDataSource<RepositoryContainer>;

	displayedColumnsRepos: string[] = ['repository'];

	currentRepo;

	updateRepositoryObservable!: Subscription;

	readonly repoSwitch = viewChild.required<RepoSwichComponent>('repoSwitch');

	constructor() {
		this.currentRepo = localStorage.getItem('repository');
		const value = sessionStorage.getItem('repositories');
		const repositories: RepositoryContainer[] = value ? JSON.parse(value) : [];
		this.repos = repositories.filter(repo => repo.repoName != this.currentRepo);
		this.filteredRepos = new MatTableDataSource(this.repos);
	}

	ngOnInit(): void {
		this.updateRepositoryObservable = this.projectService.updateRepositoryEvent.subscribe(() => {
			this.updateRepos();
		});
	}

	ngOnDestroy() {
		if (this.updateRepositoryObservable && !this.updateRepositoryObservable.closed)
			this.updateRepositoryObservable.unsubscribe();

	}

	openModal() {
		this.modalService.open(this.repoSwitch(), {ariaLabelledBy: 'modal-basic-titles'});
	}

	/**
   * Filters reporitories for searchterm
   */
	searchOnKey(filter: string) {
		this.filteredRepos.filterPredicate =  (data: RepositoryContainer, repoFilter: string) => data.repoName.trim().toLowerCase().indexOf(repoFilter) != -1;
		/* Apply filter */
		this.filteredRepos.filter = filter.trim().toLowerCase();
	}

	/**
     * Selects the repository and redirects the user to the story editor
     * @param userRepository
     */
	selectRepository(userRepository: RepositoryContainer) {
		const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
		ref.href = 'https://github.com/' + userRepository.repoName;
		localStorage.setItem('repository', userRepository.repoName);
		localStorage.setItem('source', userRepository.source);
		localStorage.setItem('id', userRepository._id!);
		location.reload();
	}

	/**
     * Update Repositories after change
     */
	updateRepos() {
		const value = sessionStorage.getItem('repositories')!;
		const repositories: RepositoryContainer[] = JSON.parse(value);
		this.repos = repositories.filter(repo => repo.repoName != this.currentRepo);
		this.filteredRepos = new MatTableDataSource(this.repos);
	}
}
