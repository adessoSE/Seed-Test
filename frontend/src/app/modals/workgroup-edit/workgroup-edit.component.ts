import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy, inject, output, viewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService } from 'src/app/Services/notification.service';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { ApiService } from 'src/app/Services/api.service';
import { ProjectService } from 'src/app/Services/project.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { RepoSwichComponent } from '../repo-swich/repo-swich.component';
import { Subscription } from 'rxjs';
import { MatSelect } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';

@Component({
	selector: 'app-workgroup-edit',
	templateUrl: './workgroup-edit.component.html',
	styleUrls: [
		'./workgroup-edit.component.css',
		'../layout-modal/layout-modal.component.css'
	],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class WorkgroupEditComponent implements OnInit, OnDestroy {
	private modalService = inject(NgbModal);
	projectService = inject(ProjectService);
	private notify = inject(NotificationService);
	dialog = inject(MatDialog);
	apiService = inject(ApiService);

	/**
   * Columns of the workgroup table
   */
	displayedColumnsWorkgroup: string[] = ['email', 'can_edit_workgroup'];

	/**
   * List of all members in the workgroup
   */
	workgroupList = [];

	/**
   * Owner of the workgroup
   */
	workgroupOwner = '';

	/**
   * Error if the request was not successful
   */
	workgroupError = '';

	/**
   * Repository container of the workgroup
   */
	workgroupProject!: RepositoryContainer;

	/**
   * Email and id of the active user
   */
	userEmail = '';
	userId = '';
	repos!: RepositoryContainer[];

	/**
   * varibales to work with settings
   */

	gecko_enabled;

	chromium_enabled;

	edge_enabled;

	webkit_enabled;

	browser!: string;

	testRunner!: string;

	waitBetweenSteps!: number;

	reportComment!: boolean;

	repoWidth!: number;

	repoHeight!: number;

	applyGlobalSettings!: boolean;

	windowSizeEnabled: boolean = false;

	/**
   * To navigiate between tabs, initial tab on global settings
   */
	currentTab: string = 'globalSettings';

	/**
   * Model Reference for closing
   */
	modalReference!: NgbModalRef;

	projectName!: string;
	@ViewChild('ownerSelect') ownerSelect!: MatSelect;
	/**
   * Selected member to transfer Ownership
   */
	selectedOwner!: string;

	/**
   * Used to notify story editor component about globalSettings
   */
	readonly globalSettingsChanged = output<boolean>();

	readonly workgroupEditModal = viewChild.required<WorkgroupEditComponent>('workgroupEditModal');
	readonly repoSwitchModal = viewChild.required<RepoSwichComponent>('repoSwitchModal');
	transferOwnershipObservable!: Subscription;
	constructor() {
		this.projectService.deleteRepositoryEvent.subscribe(() => {
			this.deleteCustomRepo();
		});
		this.projectService.getRepositories().subscribe((repos) => {
			this.repos = repos;
		});

		this.gecko_enabled = localStorage.getItem('gecko_enabled');
		this.chromium_enabled = localStorage.getItem('chromium_enabled');
		this.edge_enabled = localStorage.getItem('edge_enabled');
		this.webkit_enabled = localStorage.getItem('webkit_enabled');

		const geckoStr = localStorage.getItem('gecko_emulators');
		this.gecko_emulators = !geckoStr ? [] : geckoStr.split(',');
		const chromiumStr = localStorage.getItem('chromium_emulators');
		this.chromium_emulators = !chromiumStr ? [] : chromiumStr.split(',');
		const edgeStr = localStorage.getItem('edge_emulators');
		this.edge_emulators = !edgeStr ? [] : edgeStr.split(',');
		const playwrightStr = localStorage.getItem('playwright_emulators');
		this.playwright_emulators = !playwrightStr ? [] : playwrightStr.split(',');

	}

	ngOnInit() {
		this.transferOwnershipObservable =
			this.projectService.transferOwnershipEvent.subscribe((_) => {
				this.transferedOwnership(this.selectedOwner);
			});
	}
	ngOnDestroy() {
		if (!this.transferOwnershipObservable.closed) 
			this.transferOwnershipObservable.unsubscribe();
    
	}
	onModalClosed() {
		this.selectedOwner = undefined as any;
		this.ownerSelect = null as any;
	}

	loadGlobalSettings(): void {
		const repoId = this.workgroupProject._id!;
		this.projectService.getRepositorySettings(repoId).subscribe({
			next: (settings) => {
				if (settings) {
					this.applyGlobalSettings =
						settings.activated !== undefined ? settings.activated : false;
					if (settings.emulator) {
						this.emulator_enabled = true;
						this.emulator = settings.emulator;
					}
					this.waitBetweenSteps = settings.stepWaitTime || 0;
					this.reportComment =
						settings.reportComment !== undefined
							? settings.reportComment
							: true;
					this.browser = settings.browser || 'chromium';
					this.testRunner = settings.testRunner || 'seleniumWebdriver';
					this.repoHeight = settings.height || 0;
					this.repoWidth = settings.width || 0;
				} else {
					console.warn('No global settings found, default settings are used.');
					this.applyDefaultSettings();
				}
			},
			error: (error) => {
				console.error('Error loading global settings:', error);
				this.applyDefaultSettings();
			}
		});
	}

	/**
   * default settings if no previous settings were set for the project
   */

	applyDefaultSettings() {
		this.applyGlobalSettings = false;
		this.waitBetweenSteps = 0;
		this.reportComment = true;
		this.browser = 'chromium';
		this.testRunner = 'selenium-webdriver';
		this.emulator_enabled = false;
		this.emulator = undefined;
		this.repoHeight = 0;
		this.repoWidth = 0;
	}

	handleSizeChange(event: { width: number; height: number }) {
		this.repoWidth = event.width;
		this.repoHeight = event.height;
	}

	/**
   * Opens the workgroup edit modal
   */
	openWorkgroupEditModal(project: RepositoryContainer, userEmail: string, userId: string) {
		this.userEmail = userEmail;
		this.userId = userId;
		this.workgroupList = [];
		this.workgroupProject = project;
		if (!this.workgroupProject.aiConfig) 
			this.workgroupProject.aiConfig = {
				textPreparation: {
					name: 'local',
					modelName: 'mistral',
					provider: 'custom' as const,
					baseURL: 'http://localhost:11434/v1'
				},
				jsonConversion: {
					name: 'local',
					modelName: 'codellama',
					provider: 'custom' as const,
					baseURL: 'http://localhost:11434/v1'
				}
			};
    
		this.loadGlobalSettings();
		this.modalReference = this.modalService.open(this.workgroupEditModal(), {
			ariaLabelledBy: 'modal-basic-titles'
		});
		this.projectName = project.repoName;
		if (project.source === 'db')
			this.projectService
				.getWorkgroup(this.workgroupProject._id!)
				.subscribe((res) => {
					this.workgroupList = res.member;
					this.workgroupOwner = res.owner.email;
				});
	}

	transferedOwnership(newOwner: string) {
		document
			.getElementById('changeOwner')!
			.setAttribute('style', 'display: none');
		this.projectService.changeOwner(this.workgroupProject._id!, newOwner).subscribe((_) => {
			this.notify.success('successfully changed', 'New owner');
		});
		this.modalReference.close();
	}

	transferOwnership(selectedMember: string) {
		this.selectedOwner = selectedMember;
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: 'Transfer Ownership',
				message: 'Do you really want to transfer your ownership? You will lose your administrator rights.',
				buttons: [
					{ label: 'Confirm', value: 'confirm', color: 'warn' },
					{ label: 'Cancel', value: 'cancel' }
				]
			} as ConfirmDialogData
		});
		ref.afterClosed().subscribe(result => {
			if (result === 'confirm') this.projectService.transferOwnershipEmitter();
		});
	}
	/**
   * Invites a user to the workgroup
   * @param form
   */
	workgroupInvite(form: NgForm) {
		const email = form.value.email;
		let canEdit = form.value.canEdit;
		if (!canEdit) 
			canEdit = false;
    
		const user = { email, canEdit };
		this.workgroupError = '';
		this.projectService
			.addToWorkgroup(this.workgroupProject._id!, user)
			.subscribe(
				(_res) => {
					const originList = JSON.parse(JSON.stringify(this.workgroupList));
					originList.push(user);
					this.workgroupList = [];
					this.workgroupList = originList;
				},
				(error) => {
					this.workgroupError = error.error.error;
					this.showErrorToast();
				}
			);
	}

	/**
   * Removes a user from the workgroup
   * @param user
   */
	removeFromWorkgroup(user: any) {
		this.projectService
			.removeFromWorkgroup(this.workgroupProject._id!, user)
			.subscribe((res) => {
				this.workgroupList = res.member;
			});
	}

	/**
   * Checks if the user can edit the workgroup
   * @param event
   * @param user
   */
	checkEditUser(event: any, user: any) {
		user.canEdit = !user.canEdit;
		this.projectService
			.updateWorkgroupUser(this.workgroupProject._id!, user)
			.subscribe((res) => {
				this.workgroupList = res.member;
			});
	}

	/**
   * Delete a custom repository
   */
	deleteCustomRepo() {
		if (this.userEmail == this.workgroupOwner) {
			this.projectService
				.deleteRepository(this.workgroupProject, this.userId)
				.subscribe(() => {
					this.projectService.getRepositoriesEmitter();
					this.projectService.updateRepositoryEmitter();
				});
			this.modalReference.close();
		}
	}

	isCurrentRepoToDelete() {
		const currentRepo = localStorage.getItem('repository');
		if (this.workgroupProject.repoName === currentRepo) 
			this.openRepoSwitchModal();
		else if (this.workgroupList.length > 0)
			this.notify.info(
				'Your project has other members, either remove them beforehand or transfer your projects ownership',
				'Other members affected'
			);
		else 
			this.showDeleteRepositoryToast();
    
	}

	/**
   * Updates project and passes settings variables
   * @param project
   */
	updateRepository(project: RepositoryContainer) {
		project.settings = {
			...project.settings,
			stepWaitTime: this.waitBetweenSteps,
			reportComment: this.reportComment,
			browser: this.browser,
			testRunner: this.testRunner,
			emulator: this.emulator,
			activated: this.applyGlobalSettings,
			width: this.repoWidth,
			height: this.repoHeight
		};

		project.aiConfig = {
			textPreparation: {
				provider: 'custom' as const,
				name: project.aiConfig!.textPreparation.name,
				modelName: project.aiConfig!.textPreparation.modelName,
				baseURL: project.aiConfig!.textPreparation.baseURL,
				apiKey: project.aiConfig!.textPreparation.apiKey
			},
			jsonConversion: {
				provider: 'custom' as const,
				name: project.aiConfig!.jsonConversion.name,
				modelName: project.aiConfig!.jsonConversion.modelName,
				baseURL: project.aiConfig!.jsonConversion.baseURL,
				apiKey: project.aiConfig!.jsonConversion.apiKey
			}
		};

		this.projectService
			.updateRepository(
				project._id!,
				project.repoName,
				this.userId,
				project.settings,
				project.aiConfig
			)
			.subscribe((_resp) => {
				this.projectService.getRepositories();
				this.notify.success('successfully saved', 'Repository');
			});
	}

	async saveProject() {
		this.updateRepository(this.workgroupProject);
		this.globalSettingsChanged.emit(this.applyGlobalSettings);
		this.modalReference.close();
	}

	showDeleteRepositoryToast() {
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: 'Delete Project?',
				message: 'Are you sure you want to delete this Project? It cannot be restored.',
				buttons: [
					{ label: 'Delete', value: 'delete', color: 'warn' },
					{ label: 'Cancel', value: 'cancel' }
				]
			} as ConfirmDialogData
		});
		ref.afterClosed().subscribe(result => {
			if (result === 'delete') this.projectService.deleteRepositoryEmitter();
		});
	}

	showErrorToast() {
		this.notify.error(this.workgroupError);
	}

	/**
   * Opens repo switch modal
   */
	openRepoSwitchModal() {
		this.repoSwitchModal().openModal();
	}

	enterSubmit(event: any, form: NgForm) {
		if (event.keyCode === 13) {
			this.workgroupInvite(form);
			form.reset();
		}
	}

	/**
   * Submits the new name for the scenario
   */
	renameProject(renameProject: string) {
		const name = renameProject;
		const project = this.workgroupProject;
		if (name.replace(/\s/g, '').length > 0) 
			project.repoName = name;
    
		// Emits rename event
		this.projectService.renameProjectEmitter(project);
	}

	/**
   * Set the test runner
   * @param testRunner
   */
	setTestRunner(testRunner: string) {
		this.testRunner = testRunner;
		this.setEmulatorEnabled(false);
	}

	/**
   * Set the browser
   * @param newBrowser
   */
	setBrowser(newBrowser: string) {
		this.browser = newBrowser;
		this.setEmulatorEnabled(false);
	}

	setCurrentTab(tabName: string): void {
		this.currentTab = tabName;
	}

	// ------------------------------- EMULATOR --------------------------------
	/**
   * To store emulator
   */

	emulator: any;
	/**
   * Boolean emulator indicator
   */
	emulator_enabled: any;

	/**
   * List of supported emulators for gecko
   */
	gecko_emulators: string[];

	/**
   * List of supported emulators for chromium
   */
	chromium_emulators: string[];

	/**
   * List of supported emulators for edge
   */
	edge_emulators: string[];

	/**
   * List of supported emulators for playwright
   */
	playwright_emulators: string[];

	/**
   * Set if an emulator should be used
   * @param enabled Boolean
   */
	setEmulatorEnabled(enabled: boolean) {
		this.emulator_enabled = enabled;
		this.setEmulator(enabled ? this.getAvaiableEmulators()[0] : undefined);
	}

	/**
   * Updates emulator
   * @param selectedValue String
   */
	updateEmulatorStatus(selectedValue: string) {
		if (selectedValue === 'undefined') {
			this.emulator_enabled = false;
			this.setEmulator(undefined);
		} else {
			this.emulator_enabled = true;
			this.setEmulator(selectedValue);
		}
	}

	/**
   * Set the emultaor
   * @param newEmultaor
   */
	setEmulator(newEmulator: any) {
		this.emulator = newEmulator;
	}

	/**
   * Get the avaiable emulators
   */
	getAvaiableEmulators() {
		if (this.testRunner === 'playwright') 
			return this.playwright_emulators;
    

		// Bestehende Logik für Selenium
		switch (this.browser) {
			case 'chromium':
				return this.chromium_emulators;
			case 'firefox':
				return this.gecko_emulators;
			case 'MicrosoftEdge':
				return this.edge_emulators;
		}
		return [];
	}

	// ------------------------------- EMULATOR -----------------------------
}
