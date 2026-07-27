import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, EventEmitter } from '@angular/core';
import { of } from 'rxjs';

import { FileExplorerModalComponent } from './file-explorer-modal.component';
import { ProjectService } from '../../Services/project.service';
import { ThemingService } from '../../Services/theming.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

describe('FileExplorerModalComponent', () => {
	let component: FileExplorerModalComponent;
	let fixture: ComponentFixture<FileExplorerModalComponent>;

	const mockProjectService = {
		queryFiles: vi.fn().mockReturnValue(of([])),
		uploadFile: vi.fn().mockReturnValue(of({})),
		deleteUploadedFile: vi.fn().mockReturnValue(of({}))
	};

	const mockThemingService = {
		isDarkMode: vi.fn().mockReturnValue(false),
		themeChanged: new EventEmitter()
	};

	const mockModalService = {
		open: vi.fn()
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
    imports: [FileExplorerModalComponent],
    providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: ThemingService, useValue: mockThemingService },
        { provide: NgbModal, useValue: mockModalService }
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
});
