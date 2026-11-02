import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ThemingService } from '../../Services/theming.service';
import { StoryService } from '../../Services/story.service';

import { ExecutionListComponent } from './execution-list.component';

describe('ExecutionListComponent', () => {
	let component: ExecutionListComponent;
	let fixture: ComponentFixture<ExecutionListComponent>;

	const mockModalService = {
		open: vi.fn()
	};

	const mockThemingService = {
		isDark: signal(false),
		isDarkMode: vi.fn().mockReturnValue(false)
	};

	const mockStoryService = {
		getStory: vi.fn()
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ExecutionListComponent],
			providers: [
				{ provide: MatDialog, useValue: mockModalService },
				{ provide: ThemingService, useValue: mockThemingService },
				{ provide: StoryService, useValue: mockStoryService }
			],
			schemas: [CUSTOM_ELEMENTS_SCHEMA]
		})
			.compileComponents();

		fixture = TestBed.createComponent(ExecutionListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
