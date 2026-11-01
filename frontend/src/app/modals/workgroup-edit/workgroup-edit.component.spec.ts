import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from 'src/app/Services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { WorkgroupEditComponent } from './workgroup-edit.component';
import { ProjectService } from 'src/app/Services/project.service';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';

// Mock to prevent MatSnackBar overlay calls after injector teardown
const notificationMock = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };

const mockProject: RepositoryContainer = {
	_id: 'proj-1',
	repoName: 'Test Project',
	source: 'db',
	settings: {}
} as RepositoryContainer;

const mockWorkgroupMembers = [
	{ email: 'alice@test.de', canEdit: true },
	{ email: 'bob@test.de', canEdit: false }
];

describe('WorkgroupEditComponent', () => {
	let component: WorkgroupEditComponent;
	let fixture: ComponentFixture<WorkgroupEditComponent>;
	let projectService: ProjectService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, FormsModule, WorkgroupEditComponent, LayoutModalComponent],
			providers: [
				{ provide: NotificationService, useValue: notificationMock },
				{
					provide: MatDialog,
					useValue: { open: vi.fn().mockReturnValue({ close: vi.fn(), afterClosed: () => of(undefined) }) }
				}
			],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(WorkgroupEditComponent);
		component = fixture.componentInstance;
		projectService = TestBed.inject(ProjectService);
		// Attach the project reference so workgroup operations work
		component.workgroupProject = mockProject;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('behavioral: workgroup list operations', () => {
		it('should load workgroup members via service on openWorkgroupEditModal', () => {
			vi.spyOn(projectService, 'getWorkgroup').mockReturnValue(of({
				member: mockWorkgroupMembers,
				owner: { email: 'admin@test.de' }
			}));
			vi.spyOn(projectService, 'getRepositorySettings').mockReturnValue(of({
				activated: false, stepWaitTime: 100, reportComment: true,
				browser: 'chromium', testRunner: 'seleniumWebdriver',
				height: 0, width: 0
			}));

			component.openWorkgroupEditModal(mockProject, 'admin@test.de', 'user-1');

			expect(component.workgroupList().length).toBe(2);
			expect(component.workgroupList()[0].email).toBe('alice@test.de');
			expect(component.workgroupOwner()).toBe('admin@test.de');
		});

		it('should add a member to workgroup via workgroupInvite', () => {
			const newMember = { email: 'charlie@test.de', canEdit: false };
			vi.spyOn(projectService, 'addToWorkgroup').mockReturnValue(of({ member: [], owner: { email: '' } }));
			const form = { value: { email: 'charlie@test.de', canEdit: false }, reset: vi.fn() } as any;

			component.workgroupInvite(form);

			expect(projectService.addToWorkgroup).toHaveBeenCalledWith('proj-1', newMember);
			expect(component.workgroupList()).toContainEqual(newMember);
		});

		it('should not throw on workgroupInvite', () => {
			const form = { value: { email: 'exists@test.de', canEdit: false }, reset: vi.fn() } as any;

			expect(() => component.workgroupInvite(form)).not.toThrow();
		});

		it('should remove a member from workgroup', () => {
			component.workgroupList.set(mockWorkgroupMembers);
			vi.spyOn(projectService, 'removeFromWorkgroup').mockReturnValue(of({
				member: [{ email: 'bob@test.de', canEdit: false }],
				owner: { email: 'admin@test.de' }
			}));

			component.removeFromWorkgroup(mockWorkgroupMembers[0]);

			expect(projectService.removeFromWorkgroup).toHaveBeenCalledWith('proj-1', 'alice@test.de');
			expect(component.workgroupList()).toEqual([{ email: 'bob@test.de', canEdit: false }]);
		});

		it('should toggle edit permission for a workgroup member', () => {
			const user = { email: 'alice@test.de', canEdit: true };
			vi.spyOn(projectService, 'updateWorkgroupUser').mockReturnValue(of({
				member: [{ email: 'alice@test.de', canEdit: false }],
				owner: { email: 'admin@test.de' }
			}));

			component.checkEditUser({} as Event, user);

			expect(user.canEdit).toBe(false);
			expect(projectService.updateWorkgroupUser).toHaveBeenCalledWith('proj-1', user);
		});
	});

	describe('behavioral: workgroup creation/deletion', () => {
		it('should delete custom repository when user is owner', () => {
			component.workgroupOwner.set('admin@test.de');
			component.userEmail = 'admin@test.de';
			component.workgroupProject = mockProject;
			component.modalReference = { close: vi.fn() } as any;
			vi.spyOn(projectService, 'deleteRepository').mockReturnValue(of({} as any));

			component.deleteCustomRepo();

			expect(projectService.deleteRepository).toHaveBeenCalledWith(mockProject, component.userId);
		});
	});

	describe('behavioral: tab navigation', () => {
		it('should set currentTab on setCurrentTab', () => {
			component.setCurrentTab('workgroup');
			expect(component.currentTab).toBe('workgroup');
		});
	});

	describe('behavioral: project rename', () => {
		it('should rename the project with valid name', () => {
			vi.spyOn(projectService, 'renameProjectEmitter');
			component.renameProject('Updated Name');
			expect(component.workgroupProject.repoName).toBe('Updated Name');
			expect(projectService.renameProjectEmitter).toHaveBeenCalledWith(mockProject);
		});
	});

	describe('behavioral: browser and test runner settings', () => {
		it('should set test runner and disable emulator', () => {
			component.setTestRunner('playwright');
			expect(component.testRunner).toBe('playwright');
			expect(component.emulator_enabled).toBe(false);
		});

		it('should set browser and disable emulator', () => {
			component.setBrowser('firefox');
			expect(component.browser).toBe('firefox');
			expect(component.emulator_enabled).toBe(false);
		});
	});

	describe('behavioral: emulator logic', () => {
		it('should return available emulators for chromium', () => {
			component.browser = 'chromium';
			component.chromium_emulators = ['Pixel 2', 'iPhone X'];
			const emulators = component.getAvaiableEmulators();
			expect(emulators).toEqual(['Pixel 2', 'iPhone X']);
		});

		it('should return available emulators for playwright', () => {
			component.testRunner = 'playwright';
			component.playwright_emulators = ['iPad Pro', 'Galaxy S9'];
			const emulators = component.getAvaiableEmulators();
			expect(emulators).toEqual(['iPad Pro', 'Galaxy S9']);
		});

		it('should enable emulator and set first available', () => {
			component.chromium_emulators = ['Pixel 2', 'iPhone X'];
			component.browser = 'chromium';
			component.setEmulatorEnabled(true);
			expect(component.emulator_enabled).toBe(true);
			expect(component.emulator).toBe('Pixel 2');
		});

		it('should update emulator status when selected', () => {
			component.updateEmulatorStatus('iPhone X');
			expect(component.emulator_enabled).toBe(true);
			expect(component.emulator).toBe('iPhone X');
		});

		it('should disable emulator when "undefined" is selected', () => {
			component.emulator_enabled = true;
			component.emulator = 'Pixel 2';
			component.updateEmulatorStatus('undefined');
			expect(component.emulator_enabled).toBe(false);
			expect(component.emulator).toBeUndefined();
		});
	});

	describe('behavioral: signal-based effects', () => {
		it('should trigger deleteCustomRepo when deleteRepositoryTrigger fires', () => {
			component.modalReference = { close: vi.fn() } as any;
			vi.spyOn(component, 'deleteCustomRepo');
			projectService.deleteRepositoryEmitter();
			TestBed.flushEffects();
			expect(component.deleteCustomRepo).toHaveBeenCalled();
		});
	});

	describe('behavioral: modal close reset', () => {
		it('should reset selectedOwner on modal closed', () => {
			component.selectedOwner = 'alice@test.de';
			component.onModalClosed();
			expect(component.selectedOwner).toBeUndefined();
		});
	});

	describe('behavioral: AI config defaults on open', () => {
		const savedAi = { name: 'openai', modelName: 'gpt-4o', provider: 'custom' as const, baseURL: 'https://ai.example' };

		beforeEach(() => {
			vi.spyOn(projectService, 'checkAiAvailability').mockReturnValue(of(false));
			// The component guards `if (settings)`, so "no saved settings" is undefined, not null
			vi.spyOn(projectService, 'getRepositorySettings').mockReturnValue(of(undefined));
		});

		it('keeps a saved jsonConversion when textPreparation is missing', () => {
			// source 'github' skips the getWorkgroup call that only applies to db-backed projects
			const project = { ...mockProject, source: 'github', aiConfig: { jsonConversion: savedAi } } as unknown as RepositoryContainer;

			component.openWorkgroupEditModal(project, 'admin@test.de', 'user-1');

			expect(component.workgroupProject.aiConfig?.jsonConversion).toEqual(savedAi);
			expect(component.workgroupProject.aiConfig?.textPreparation.name).toBe('local');
		});

		it('keeps a saved textPreparation and fills in a missing jsonConversion', () => {
			const project = { ...mockProject, source: 'github', aiConfig: { textPreparation: savedAi } } as unknown as RepositoryContainer;

			component.openWorkgroupEditModal(project, 'admin@test.de', 'user-1');

			expect(component.workgroupProject.aiConfig?.textPreparation).toEqual(savedAi);
			expect(component.workgroupProject.aiConfig?.jsonConversion.name).toBe('local');
		});
	});

	describe('behavioral: saving project settings', () => {
		it('refetches the repository list over HTTP after a successful save', () => {
			const http = TestBed.inject(HttpTestingController);
			vi.spyOn(projectService, 'updateRepository').mockReturnValue(of({} as RepositoryContainer));

			component.updateRepository({ ...mockProject });

			// A getRepositories() call that is never subscribed sends no request, so the list stayed stale
			http.expectOne(req => req.method === 'GET' && req.url.endsWith('/repository/')).flush([]);
			http.verify();
		});
	});

	describe('behavioral: save payload window size', () => {
		it('omits width and height from the save payload when no window size is set', () => {
			const http = TestBed.inject(HttpTestingController);
			component.repoWidth = 0;
			component.repoHeight = 0;

			// A stored 0 must not survive the settings spread either
			component.updateRepository({ ...mockProject, settings: { width: 0, height: 0 } });

			// The backend schema accepts only positive integers, so a 0 "no size" value made every save fail with 400
			const req = http.expectOne(r => r.method === 'PUT');
			expect(req.request.body.settings).not.toHaveProperty('width');
			expect(req.request.body.settings).not.toHaveProperty('height');
			req.flush({});
		});

		it('sends width and height when a window size is set', () => {
			const http = TestBed.inject(HttpTestingController);
			component.repoWidth = 800;
			component.repoHeight = 600;

			component.updateRepository({ ...mockProject, settings: {} });

			const req = http.expectOne(r => r.method === 'PUT');
			expect(req.request.body.settings.width).toBe(800);
			expect(req.request.body.settings.height).toBe(600);
			req.flush({});
		});

		it('keeps the stored window size while the settings are not loaded yet (repoWidth undefined)', () => {
			const http = TestBed.inject(HttpTestingController);
			component.repoWidth = undefined as unknown as number;
			component.repoHeight = undefined as unknown as number;

			// Regression: undefined was treated like "no size", so saving before the settings loaded dropped the stored 800x600
			component.updateRepository({ ...mockProject, settings: { width: 800, height: 600 } });

			const req = http.expectOne(r => r.method === 'PUT');
			expect(req.request.body.settings.width).toBe(800);
			expect(req.request.body.settings.height).toBe(600);
			req.flush({});
		});
	});

	describe('behavioral: transfer ownership', () => {
		let changeOwnerButton: HTMLElement;

		beforeEach(() => {
			// transferedOwnership hides this element by id before calling the service
			changeOwnerButton = document.createElement('button');
			changeOwnerButton.id = 'changeOwner';
			document.body.appendChild(changeOwnerButton);
			component.modalReference = { close: vi.fn() } as any;
			component.workgroupProject = mockProject;
			notificationMock.error.mockClear();
			notificationMock.success.mockClear();
		});

		afterEach(() => changeOwnerButton.remove());

		it('shows an error toast and logs the cause when the transfer fails', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
			vi.spyOn(projectService, 'changeOwner').mockReturnValue(
				throwError(() => new HttpErrorResponse({ status: 500 }))
			);

			component.transferedOwnership('bob@test.de');

			expect(projectService.changeOwner).toHaveBeenCalledWith('proj-1', 'bob@test.de');
			expect(notificationMock.error).toHaveBeenCalledWith('Could not transfer ownership.');
			expect(notificationMock.success).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('shows a success toast when the transfer succeeds', () => {
			vi.spyOn(projectService, 'changeOwner').mockReturnValue(of({} as any));

			component.transferedOwnership('bob@test.de');

			expect(notificationMock.success).toHaveBeenCalledWith('successfully changed', 'New owner');
			expect(notificationMock.error).not.toHaveBeenCalled();
		});
	});
});
