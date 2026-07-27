import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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
		isDarkMode: vi.fn().mockReturnValue(false),
		themeChanged: new EventEmitter()
	};

	const mockStoryService = {
		getStory: vi.fn()
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ ExecutionListComponent ],
			providers: [
				{ provide: NgbModal, useValue: mockModalService },
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
