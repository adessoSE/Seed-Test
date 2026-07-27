import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { NewStepRequestComponent } from './new-step-request.component';

describe('NewStepRequestComponent', () => {
	let component: NewStepRequestComponent;
	let fixture: ComponentFixture<NewStepRequestComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, NewStepRequestComponent, LayoutModalComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(NewStepRequestComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
