import { Component, ChangeDetectionStrategy, inject, viewChild, signal, effect, untracked } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ProjectService } from 'src/app/Services/project.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-repo-swich',
	templateUrl: './repo-swich.component.html',
	styleUrls: ['./repo-swich.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
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
		// untracked() because repos()/filteredRepos() reads inside updateRepos()
		// are side-effects of the trigger, not intended effect dependencies.
		const trigger = untracked(() => this.projectService.updateRepositoryTrigger());
		if (trigger === 0) return; // skip initial value
		untracked(() => this.updateRepos());
	});

	constructor() {
		this.currentRepo = localStorage.getItem('repository');
		// repositoriesSignal is the single source of truth — read from the signal
		// so repo-switch always reflects the authoritative list. sessionStorage
		// is unreliable: the key may be absent right after a refresh (before the
		// backend fetch writes it), causing the !-asserted read in updateRepos()
		// to throw "Cannot read properties of null" on JSON.parse(null).
		const repositories = this.projectService.repositoriesSignal();
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
		this.projectService.selectRepository(userRepository);
		location.reload();
	}

	/**
     * Update Repositories after change
     */
	updateRepos() {
		// Read from the signal (single source of truth) instead of sessionStorage.
		// sessionStorage.getItem() returns null when the key is missing, and the
		// ! non-null assertion on the old code caused JSON.parse(null) → crash.
		const repositories = this.projectService.repositoriesSignal();
		this.repos.set(repositories.filter(repo => repo.repoName != this.currentRepo));
		this.filteredRepos.set(new MatTableDataSource(this.repos()));
	}
}
