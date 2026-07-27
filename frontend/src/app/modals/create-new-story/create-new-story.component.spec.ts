import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { findComponent } from '../../../test_helper';
import { CreateNewStoryComponent } from './create-new-story.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA, ViewContainerRef } from '@angular/core';

describe('CreateNewStoryComponent', () => {
	let fixture: ComponentFixture<CreateNewStoryComponent>;
	let component: CreateNewStoryComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CreateNewStoryComponent],
			imports: [FormsModule, ReactiveFormsModule, HttpClientTestingModule, MatSnackBarModule],
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
		vcRef.createEmbeddedView(component.createNewStoryModal);
		fixture.detectChanges();
	});

	it('create the app', fakeAsync(() => {
		expect(component).toBeDefined();
	}));

	it('story form to be truthy & invalid', fakeAsync(() => {
		expect(component.storyForm).toBeTruthy();
		expect(component.storyForm.valid).toBeFalsy();
	}));

	it('test group form elemnt count', fakeAsync(() => {
		const inputElemnt = fixture.debugElement.queryAll(By.css('#storytitle'));
		const textElement = fixture.debugElement.queryAll(By.css('#storydescription'));
		expect(inputElemnt.length).toEqual(1);
		expect(textElement.length).toEqual(1);
	}));

	it('should leave disabled the submit button', fakeAsync(() => {
		const submitbutton = findComponent(fixture, '.normalButton');
		expect(submitbutton.nativeElement.disabled).toBeTruthy();
	}));

	it('should define title & description', fakeAsync(() => {
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
