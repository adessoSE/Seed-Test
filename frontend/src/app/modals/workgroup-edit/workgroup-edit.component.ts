import { Component, ChangeDetectionStrategy, inject, output, viewChild, signal, effect, untracked, TemplateRef } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { NotificationService } from 'src/app/Services/notification.service';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ApiService } from 'src/app/Services/api.service';
import { ProjectService } from 'src/app/Services/project.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { RepoSwichComponent } from '../repo-swich/repo-swich.component';

import { MatSelect, MatFormField, MatLabel, MatOption } from '@angular/material/select';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';
import { WindowSizeComponent } from '../window-size/window-size.component';

import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-workgroup-edit',
	templateUrl: './workgroup-edit.component.html',
	styleUrls: [
		'./workgroup-edit.component.css',
		'../layout-modal/layout-modal.component.css'
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RepoSwichComponent, LayoutModalComponent, FormsModule, WindowSizeComponent, MatFormField, MatLabel, MatSelect, MatOption, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatIconModule]
})
export class WorkgroupEditComponent {
	projectService = inject(ProjectService);
	private notify = inject(NotificationService);
	dialog = inject(MatDialog);
	apiService = inject(ApiService);

	/** Whether the AI module is available on the backend — hides AI settings tab when unavailable */
	readonly isAiAvailable = signal(false);

	/**
   * Columns of the workgroup table
   */
	displayedColumnsWorkgroup: string[] = ['email', 'can_edit_workgroup'];

	/**
   * List of all members in the workgroup
   */
	readonly workgroupList = signal<{ email: string; canEdit: boolean }[]>([]);

	/**
   * Owner of the workgroup
   */
	readonly workgroupOwner = signal<string>('');

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

	gecko_enabled: string | null;

	chromium_enabled: string | null;

	edge_enabled: string | null;

	webkit_enabled: string | null;

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
	modalReference!: MatDialogRef<unknown>;

	projectName!: string;
	readonly ownerSelect = viewChild<MatSelect>('ownerSelect');
	/**
   * Selected member to transfer Ownership
   */
	selectedOwner!: string;

	/**
   * Used to notify story editor component about globalSettings
   */
	readonly globalSettingsChanged = output<boolean>();

	readonly workgroupEditModal = viewChild.required<TemplateRef<unknown>>('workgroupEditModal');
	readonly repoSwitchModal = viewChild.required<RepoSwichComponent>('repoSwitchModal');
	/** Handles repository deletion when service triggers */
	private deleteRepoEffect = effect(() => {
		const trigger = this.projectService.deleteRepositoryTrigger();
		if (trigger === 0) return;
		this.deleteCustomRepo();
	});

	/** Handles ownership transfer when service triggers */
	private transferOwnershipEffect = effect(() => {
		const trigger = this.projectService.transferOwnershipTrigger();
		if (trigger === 0) return;
		this.transferedOwnership(this.selectedOwner);
	});

	/** Syncs the repos plain property with projectService.repositoriesSignal() so it stays reactive
	 * for OnPush change detection. Reacting to signal updates avoids a manual subscription that would set a
	 * non-reactive plain property and never unsubscribe
	 * and the effect auto-cleans when the component is destroyed. */
	private reposSyncEffect = effect(() => {
		const repos = this.projectService.repositoriesSignal();
		untracked(() => {
			this.repos = repos;
		});
	});

	constructor() {
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

	onModalClosed() {
		this.selectedOwner = undefined!;
		// ownerSelect is a signal viewChild — Angular manages its lifecycle automatically
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
		this.workgroupList.set([]);
		this.workgroupProject = project;
		// Check AI availability on open so the AI tab can be conditionally hidden
		this.projectService.checkAiAvailability().subscribe({
			next: available => this.isAiAvailable.set(available),
			// checkAiAvailability already maps HTTP errors to false; this guards against a future change to that
			error: (err) => this.notifyFailure('Could not check AI availability.', err)
		});
		// Deep-check per sub-object: aiConfig may exist but have missing sub-fields (e.g. empty object from DB).
		// Defaults come first so existing values win; replacing the whole aiConfig when only one
		// sub-object was incomplete would silently drop the other one (e.g. a saved jsonConversion).
		const aiConfig = this.workgroupProject.aiConfig;
		this.workgroupProject.aiConfig = {
			textPreparation: {
				name: 'local',
				modelName: 'mistral',
				provider: 'custom' as const,
				baseURL: 'http://localhost:11434/v1',
				...aiConfig?.textPreparation
			},
			jsonConversion: {
				name: 'local',
				modelName: 'codellama',
				provider: 'custom' as const,
				baseURL: 'http://localhost:11434/v1',
				...aiConfig?.jsonConversion
			}
		};

		this.loadGlobalSettings();
		this.modalReference = this.dialog.open(this.workgroupEditModal(), {
			...MODAL_CONFIG,
			ariaLabelledBy: 'modal-basic-titles'
		});
		this.projectName = project.repoName;
		if (project.source === 'db')
			this.projectService
				.getWorkgroup(this.workgroupProject._id!)
				.subscribe({
					next: (res) => {
						this.workgroupList.set(res.member);
						this.workgroupOwner.set(res.owner.email);
					},
					error: (err) => this.notifyFailure('Could not load the workgroup members.', err)
				});
	}

	transferedOwnership(newOwner: string) {
		document
			.getElementById('changeOwner')!
			.setAttribute('style', 'display: none');
		this.projectService.changeOwner(this.workgroupProject._id!, newOwner).subscribe({
			next: (_) => {
				this.notify.success('successfully changed', 'New owner');
				// Invalidate repository cache so the UI reflects the new owner immediately
				this.projectService.updateRepositoryEmitter();
			},
			// The modal is already closed at this point, so the failure is only visible through the toast
			error: (err) => this.notifyFailure('Could not transfer ownership.', err)
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
					const originList = JSON.parse(JSON.stringify(this.workgroupList()));
					originList.push(user);
					this.workgroupList.set(originList);
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
	removeFromWorkgroup(user: { email: string; canEdit: boolean }) {
		this.projectService
			.removeFromWorkgroup(this.workgroupProject._id!, user.email)
			.subscribe({
				next: (res) => this.workgroupList.set(res.member),
				error: (err) => this.notifyFailure('Could not remove the member.', err)
			});
	}

	/**
   * Checks if the user can edit the workgroup
   * @param event
   * @param user
   */
	checkEditUser(_event: Event, user: { email: string; canEdit: boolean }) {
		user.canEdit = !user.canEdit;
		this.projectService
			.updateWorkgroupUser(this.workgroupProject._id!, user)
			.subscribe({
				next: (res) => this.workgroupList.set(res.member),
				error: (err) => this.notifyFailure('Could not change the edit permission.', err)
			});
	}

	/**
   * Delete a custom repository
   */
	deleteCustomRepo() {
		if (this.userEmail == this.workgroupOwner()) {
			this.projectService
				.deleteRepository(this.workgroupProject, this.userId)
				.subscribe({
					next: () => {
						this.projectService.getRepositoriesEmitter();
						this.projectService.updateRepositoryEmitter();
					},
					error: (err) => this.notifyFailure('Could not delete the project.', err)
				});
			this.modalReference.close();
		}
	}

	isCurrentRepoToDelete() {
		const currentRepo = localStorage.getItem('repository');
		if (this.workgroupProject.repoName === currentRepo) 
			this.openRepoSwitchModal();
		else if (this.workgroupList().length > 0)
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
			// Undefined while the settings are not loaded yet: the stored size is kept instead of being overwritten with undefined
			width: this.repoWidth ?? project.settings?.width,
			height: this.repoHeight ?? project.settings?.height
		};
		// CASE 1: window size set (> 0) — sent as is
		// CASE 2: no window size (0) — the key is removed, not sent as 0, because the backend rejects 0 with 400 (its schema accepts only positive integers)
		// This also drops a stored 0 that the spread above carried over from the old settings
		if (project.settings.width === 0) delete project.settings.width;
		if (project.settings.height === 0) delete project.settings.height;

		project.aiConfig = {
			textPreparation: {
				provider: 'custom' as const,
				// Fall back to 'local' when textPreparation is missing entirely (imported repo without AI config)
				name: project.aiConfig?.textPreparation?.name ?? 'local',
				modelName: project.aiConfig?.textPreparation?.modelName ?? '',
				baseURL: project.aiConfig?.textPreparation?.baseURL ?? '',
				apiKey: project.aiConfig?.textPreparation?.apiKey ?? ''
			},
			jsonConversion: {
				provider: 'custom' as const,
				name: project.aiConfig?.jsonConversion?.name ?? 'local',
				modelName: project.aiConfig?.jsonConversion?.modelName ?? '',
				baseURL: project.aiConfig?.jsonConversion?.baseURL ?? '',
				apiKey: project.aiConfig?.jsonConversion?.apiKey ?? ''
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
			.subscribe({
				next: (_resp) => {
					// Refetches the list. A bare getRepositories() call is cold and not subscribed, so it sent no request.
					this.projectService.updateRepositoryEmitter();
					this.notify.success('successfully saved', 'Repository');
				},
				error: (err) => this.notifyFailure('Could not save the project.', err)
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
	 * Logs a failed workgroup request and tells the user with a toast.
	 * Without this, a rejected HTTP call would fail silently, since none of these
	 * subscriptions had an error callback before.
	 * @param message User-facing text; the raw error is only logged to the console
	 * @param err The error emitted by the HTTP observable
	 */
	private notifyFailure(message: string, err: unknown) {
		console.error(message, err);
		this.notify.error(message);
	}

	/**
   * Opens repo switch modal
   */
	openRepoSwitchModal() {
		this.repoSwitchModal().openModal();
	}

	enterSubmit(event: KeyboardEvent, form: NgForm) {
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

	emulator: string | undefined;
	/**
   * Boolean emulator indicator
   */
	emulator_enabled!: boolean;

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
	setEmulator(newEmulator: string | undefined) {
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
