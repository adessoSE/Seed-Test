import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { CreateScenarioComponent } from './create-scenario.component';

describe('CreateScenarioComponent', () => {
	let component: CreateScenarioComponent;
	let fixture: ComponentFixture<CreateScenarioComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, CreateScenarioComponent, LayoutModalComponent],
			providers: [provideRouter([])],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CreateScenarioComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
