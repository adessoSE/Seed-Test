import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { EditableComponent } from './editable.component';
import { NO_ERRORS_SCHEMA, TemplateRef } from '@angular/core';

describe('EditableComponent', () => {
	let _component: EditableComponent;
	let _fixture: ComponentFixture<EditableComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [EditableComponent],
			providers: [TemplateRef],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		//fixture = TestBed.createComponent(EditableComponent);
		//component = fixture.componentInstance;
		//fixture.detectChanges();
	});

	it('should create', () => {
		//expect(component).toBeTruthy();
	});
}); 
