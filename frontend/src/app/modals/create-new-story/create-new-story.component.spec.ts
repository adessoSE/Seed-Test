import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { findComponent } from '../../../test_helper';
import { CreateNewStoryComponent } from './create-new-story.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA, ViewContainerRef } from '@angular/core';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService } from 'src/app/Services/notification.service';

describe('CreateNewStoryComponent', () => {
	let fixture: ComponentFixture<CreateNewStoryComponent>;
	let component: CreateNewStoryComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, ReactiveFormsModule, HttpClientTestingModule, MatSnackBarModule, CreateNewStoryComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CreateNewStoryComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();

		// Render the ng-template content — the component wraps its form in <ng-template #createNewStoryModal>
		const vcRef = fixture.debugElement.injector.get(ViewContainerRef);
		vcRef.createEmbeddedView(component.createNewStoryModal());
		fixture.detectChanges();
	});

	// Regression: without a selected project the story was sent with repo null and the backend answered 400
	describe('createNewStory without a selected project', () => {
		it('does not create the story and reports the problem when no repository is selected', () => {
			localStorage.removeItem('id');
			const createSpy = vi.spyOn(component.storyService, 'createCustomStoryEvent');
			const errorSpy = vi.spyOn(TestBed.inject(NotificationService), 'error');
			component.modalReference = { close: vi.fn(), dismiss: vi.fn() } as unknown as NgbModalRef;
			component.storyForm.setValue({ storyTitle: 'new story', storyDescription: '' });

			component.createNewStory();

			expect(createSpy).not.toHaveBeenCalled();
			expect(errorSpy).toHaveBeenCalled();
		});
	});

	it('create the app', (() => {
		expect(component).toBeDefined();
	}));

	it('story form to be truthy & invalid', (() => {
		expect(component.storyForm).toBeTruthy();
		expect(component.storyForm.valid).toBeFalsy();
	}));

	it('test group form elemnt count', (() => {
		const inputElemnt = fixture.debugElement.queryAll(By.css('#storytitle'));
		const textElement = fixture.debugElement.queryAll(By.css('#storydescription'));
		expect(inputElemnt.length).toEqual(1);
		expect(textElement.length).toEqual(1);
	}));

	it('should leave disabled the submit button', (() => {
		const submitbutton = findComponent(fixture, '.normalButton');
		expect(submitbutton.nativeElement.disabled).toBeTruthy();
	}));

	it('should define title & description', (() => {
		const inputElemnt = findComponent(fixture, '#storytitle');
		inputElemnt.nativeElement.value = 'new story name';
		inputElemnt.nativeElement.dispatchEvent(new Event('input'));
		const textElement = findComponent(fixture, '#storydescription');
		textElement.nativeElement.value = 'a brief story desctiption';
		textElement.nativeElement.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		expect(inputElemnt.nativeElement.value).toEqual('new story name');
		expect(textElement.nativeElement.value).toEqual('a brief story desctiption');
	}));
});
