import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

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
						isDarkMode: () => false,
						themeChanged: of(false)
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
						queryFiles: () => of([]),
						deleteUploadedFile: vi.fn(),
						uploadFile: vi.fn()
					}
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
