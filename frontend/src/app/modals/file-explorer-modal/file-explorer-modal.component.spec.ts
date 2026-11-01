import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { of } from 'rxjs';

import { FileExplorerModalComponent } from './file-explorer-modal.component';
import { ProjectService } from '../../Services/project.service';
import { ThemingService } from '../../Services/theming.service';
import { MatDialog } from '@angular/material/dialog';

describe('FileExplorerModalComponent', () => {
	let component: FileExplorerModalComponent;
	let fixture: ComponentFixture<FileExplorerModalComponent>;

	const mockProjectService = {
		queryFiles: vi.fn().mockReturnValue(of([])),
		uploadFile: vi.fn().mockReturnValue(of({})),
		deleteUploadedFile: vi.fn().mockReturnValue(of({}))
	};

	const mockThemingService = {
		isDark: signal(false),
		isDarkMode: vi.fn().mockReturnValue(false)
	};

	const mockModalService = {
		open: vi.fn().mockReturnValue({ close: vi.fn(), afterClosed: () => of(undefined) })
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FileExplorerModalComponent],
			providers: [
				{ provide: ProjectService, useValue: mockProjectService },
				{ provide: ThemingService, useValue: mockThemingService },
				{ provide: MatDialog, useValue: mockModalService }
			],
			schemas: [CUSTOM_ELEMENTS_SCHEMA]
		})
			.compileComponents();

		fixture = TestBed.createComponent(FileExplorerModalComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should resolve to undefined when the modal is dismissed', async () => {
		mockModalService.open.mockReturnValueOnce({ close: vi.fn(), afterClosed: () => of(undefined) });
		await expect(component.openFileExplorerModal()).resolves.toBeUndefined();
	});
});
