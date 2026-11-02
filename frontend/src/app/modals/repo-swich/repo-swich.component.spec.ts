import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ProjectService } from 'src/app/Services/project.service';
import { RepoSwichComponent } from './repo-swich.component';
import { vi } from 'vitest';

@Component({
	selector: 'app-layout-modal',
	template: '',
	imports: [FormsModule],
	standalone: true
})
class FakeLayoutModalComponent {}

const makeRepo = (name: string, id: string): RepositoryContainer => ({
	_id: id,
	repoName: name,
	source: 'github'
});

describe('RepoSwichComponent', () => {
	let component: RepoSwichComponent;
	let fixture: ComponentFixture<RepoSwichComponent>;
	let projectService: ProjectService;

	const repos: RepositoryContainer[] = [
		makeRepo('owner/repo-A', 'repo-a-id'),
		makeRepo('owner/repo-B', 'repo-b-id')
	];

	const createMockService = (overrides: Record<string, unknown> = {}) => ({
		updateRepositoryTrigger: vi.fn().mockReturnValue(0),
		getRepositoriesTrigger: vi.fn(),
		deleteRepositoryTrigger: vi.fn(),
		repositoriesSignal: vi.fn().mockReturnValue(repos),
		...overrides
	});

	beforeEach(async () => {
		const mock = createMockService();
		await TestBed.configureTestingModule({
			imports: [
				HttpClientTestingModule,
				MatSnackBarModule,
				MatTableModule,
				FormsModule,
				RepoSwichComponent,
				FakeLayoutModalComponent
			],
			providers: [
				{ provide: ProjectService, useValue: mock }
			],
			schemas: [NO_ERRORS_SCHEMA]
		}).compileComponents();

		projectService = TestBed.inject(ProjectService) as unknown as ProjectService;
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoSwichComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should read repositories from repositoriesSignal in constructor', () => {
		expect(projectService.repositoriesSignal).toHaveBeenCalled();
		const currentRepos = component.repos();
		expect(currentRepos.length).toBe(2);
		expect(currentRepos[0].repoName).toBe('owner/repo-A');
	});

	it('should filter out currentRepo from localStorage', () => {
		localStorage.setItem('repository', 'owner/repo-A');
		const mock = createMockService();
		mock.repositoriesSignal.mockReturnValue(repos);

		const fixture2 = TestBed.createComponent(RepoSwichComponent);
		const comp2 = fixture2.componentInstance;
		fixture2.detectChanges();

		const filtered = comp2.repos();
		expect(filtered.length).toBe(1);
		expect(filtered[0].repoName).toBe('owner/repo-B');
	});

	it('updateRepos should read from signal not sessionStorage', () => {
		const freshRepos: RepositoryContainer[] = [
			makeRepo('owner/repo-C', 'repo-c-id')
		];

		const mock = createMockService();
		mock.repositoriesSignal.mockReturnValue(freshRepos);

		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [
				HttpClientTestingModule,
				MatSnackBarModule,
				MatTableModule,
				FormsModule,
				RepoSwichComponent,
				FakeLayoutModalComponent
			],
			providers: [
				{ provide: ProjectService, useValue: mock }
			],
			schemas: [NO_ERRORS_SCHEMA]
		});

		localStorage.setItem('repository', '');
		const fixture2 = TestBed.createComponent(RepoSwichComponent);
		const comp2 = fixture2.componentInstance;
		fixture2.detectChanges();

		comp2.updateRepos();

		expect(comp2.repos().length).toBe(1);
		expect(comp2.repos()[0].repoName).toBe('owner/repo-C');
	});
});
