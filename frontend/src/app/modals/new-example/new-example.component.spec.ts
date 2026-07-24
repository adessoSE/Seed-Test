import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastrModule } from 'ngx-toastr';

import { NewExampleComponent } from './new-example.component';

describe('NewExampleComponent', () => {
	let component: NewExampleComponent;
	let fixture: ComponentFixture<NewExampleComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ NewExampleComponent ],
			imports: [HttpClientTestingModule, ToastrModule.forRoot(), ReactiveFormsModule],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(NewExampleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
