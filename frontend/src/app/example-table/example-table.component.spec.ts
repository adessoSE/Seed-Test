import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ExampleTableComponent } from './example-table.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';


describe('ExampleTableComponent', () => {
	let component: ExampleTableComponent;
	let fixture: ComponentFixture<ExampleTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, ExampleTableComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ExampleTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	describe('create', () => {
		it('should create', () => {
			expect(component).toBeTruthy();
		});
	});

});