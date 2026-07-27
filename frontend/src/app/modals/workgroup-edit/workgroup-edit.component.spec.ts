import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from 'src/app/Services/notification.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { WorkgroupEditComponent } from './workgroup-edit.component';

// Mock to prevent MatSnackBar overlay calls after injector teardown
const notificationMock = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };

describe('WorkgroupEditComponent', () => {
	let component: WorkgroupEditComponent;
	let fixture: ComponentFixture<WorkgroupEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, WorkgroupEditComponent, LayoutModalComponent],
			providers: [{ provide: NotificationService, useValue: notificationMock }],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(WorkgroupEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
