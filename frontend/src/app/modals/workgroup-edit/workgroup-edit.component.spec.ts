import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from 'src/app/Services/notification.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { WorkgroupEditComponent } from './workgroup-edit.component';
import { ProjectService } from 'src/app/Services/project.service';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';

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
					provide: NgbModal,
					useValue: { open: vi.fn().mockReturnValue({ result: Promise.resolve(), close: vi.fn() }) }
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
});
