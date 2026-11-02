import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { FileElement } from '@seed-test/shared/models/FileElement';

import { FileManagerComponent } from './file-manager.component';
import { ThemingService } from '../Services/theming.service';
import { StoryService } from '../Services/story.service';
import { ProjectService } from '../Services/project.service';

describe('FileManagerComponent', () => {
	let component: FileManagerComponent;
	let fixture: ComponentFixture<FileManagerComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FileManagerComponent],
			providers: [
				{
					provide: ThemingService,
					useValue: {
						isDark: signal(false),
						isDarkMode: () => false
					}
				},
				{
					provide: StoryService,
					useValue: {
						changeStoryViewEvent: vi.fn()
					}
				},
				{
					provide: ProjectService,
					useValue: {
						fileElements: signal<FileElement[]>([]),
						queryFiles: vi.fn().mockReturnValue(of([])),
						deleteUploadedFile: vi.fn().mockReturnValue(of({})),
						uploadFile: vi.fn().mockReturnValue(of({} as FileElement))
					} as Partial<ProjectService>
				}
			]
		})
			.compileComponents();

		fixture = TestBed.createComponent(FileManagerComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
