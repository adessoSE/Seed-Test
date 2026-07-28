import { Component, ChangeDetectionStrategy, inject, viewChild, signal, effect } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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
export class RepoSwichComponent {
	private modalService = inject(NgbModal);
	projectService = inject(ProjectService);


	readonly repos = signal<RepositoryContainer[]>([]);

	readonly filteredRepos = signal(new MatTableDataSource<RepositoryContainer>());

	displayedColumnsRepos: string[] = ['repository'];

	currentRepo;

	readonly repoSwitch = viewChild.required<RepoSwichComponent>('repoSwitch');

	/** Reacts to repository update trigger — refreshes repos list */
	private updateReposEffect = effect(() => {
		const trigger = this.projectService.updateRepositoryTrigger();
		if (trigger === 0) return; // skip initial value
		this.updateRepos();
	});

	constructor() {
		this.currentRepo = localStorage.getItem('repository');
		const value = sessionStorage.getItem('repositories');
		const repositories: RepositoryContainer[] = value ? JSON.parse(value) : [];
		const filtered = repositories.filter(repo => repo.repoName != this.currentRepo);
		this.repos.set(filtered);
		this.filteredRepos.set(new MatTableDataSource(filtered));
	}

	openModal() {
		this.modalService.open(this.repoSwitch(), {ariaLabelledBy: 'modal-basic-titles'});
	}

	/**
   * Filters reporitories for searchterm
   */
	searchOnKey(filter: string) {
		this.filteredRepos().filterPredicate =  (data: RepositoryContainer, repoFilter: string) => data.repoName.trim().toLowerCase().indexOf(repoFilter) != -1;
		/* Apply filter */
		this.filteredRepos().filter = filter.trim().toLowerCase();
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
		this.repos.set(repositories.filter(repo => repo.repoName != this.currentRepo));
		this.filteredRepos.set(new MatTableDataSource(this.repos()));
	}
}
