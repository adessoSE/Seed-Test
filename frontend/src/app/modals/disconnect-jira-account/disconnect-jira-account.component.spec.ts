import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { DisconnectJiraAccountComponent } from './disconnect-jira-account.component';

describe('DisconnectJiraAccountComponent', () => {
	let component: DisconnectJiraAccountComponent;
	let fixture: ComponentFixture<DisconnectJiraAccountComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ DisconnectJiraAccountComponent, LayoutModalComponent ],
			imports: [HttpClientTestingModule, MatSnackBarModule]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DisconnectJiraAccountComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
