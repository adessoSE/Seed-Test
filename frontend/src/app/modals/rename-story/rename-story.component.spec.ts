import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, ViewContainerRef } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { findComponent } from '../../../test_helper';
import { RenameStoryComponent } from './rename-story.component';


describe('RenameStoryComponent', () => {
	let fixture: ComponentFixture<RenameStoryComponent>;
	let component: RenameStoryComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, ReactiveFormsModule, HttpClientTestingModule, MatSnackBarModule, RenameStoryComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(RenameStoryComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();

		// Render the ng-template content — the component wraps its form in <ng-template #renameStoryModal>
		const vcRef = fixture.debugElement.injector.get(ViewContainerRef);
		vcRef.createEmbeddedView(component.renameStoryModal());
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeDefined();
	});

	describe('reactive form', () => {

		it('should update story title & description', fakeAsync(() => {
			const inputElemnt = findComponent(fixture, '#newStoryTitle');
			const newName = 'updated story name';
			const newDescription = 'an updated brief story desctiption';
			inputElemnt.nativeElement.value = newName;
			inputElemnt.nativeElement.dispatchEvent(new Event('input'));
			const textElement = findComponent(fixture, '#newStoryDescription');
			textElement.nativeElement.value = newDescription;
			textElement.nativeElement.dispatchEvent(new Event('input'));
			fixture.detectChanges();
			expect(inputElemnt.nativeElement.value).toEqual(newName);
			expect(textElement.nativeElement.value).toEqual(newDescription);
		}));

		it('should leave disabled the submit button', fakeAsync(() => {
			const inputElemnt = findComponent(fixture, '#newStoryTitle');
			inputElemnt.nativeElement.value = '';
			inputElemnt.nativeElement.dispatchEvent(new Event('input'));
			const textElement = findComponent(fixture, '#newStoryDescription');
			textElement.nativeElement.value = 'an updated brief story desctiption';
			textElement.nativeElement.dispatchEvent(new Event('input'));
			fixture.detectChanges();
			const submitbutton = findComponent(fixture, '.normalButton');
			expect(submitbutton.nativeElement.disabled).toBeTruthy();
		}));

	});
});
