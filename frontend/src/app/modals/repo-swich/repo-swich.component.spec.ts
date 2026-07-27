import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';

const _repositories: RepositoryContainer[] = [{_id: '1', repoName: 'myFirstRepo', source: 'db', canEdit: true},
	{_id: '2', repoName: 'githubRepo', source: 'github', canEdit: true},
	{_id: '', repoName: 'jiraRepo', source: 'jira', canEdit: true}];


describe('RepoSwichComponent', () => {

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, LayoutModalComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach( () => {
	});

	it('should create', async () => {
		//
	});
});
