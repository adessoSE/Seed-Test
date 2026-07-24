import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { WindowSizeComponent } from './window-size.component';

describe('WindowSizeComponent', () => {
	let component: WindowSizeComponent;
	let fixture: ComponentFixture<WindowSizeComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ WindowSizeComponent ],
			imports: [
				FormsModule,
				NoopAnimationsModule,
				MatMenuModule,
				MatFormFieldModule,
				MatSelectModule,
				MatInputModule,
				MatButtonModule
			]
		})
			.compileComponents();

		fixture = TestBed.createComponent(WindowSizeComponent);
		component = fixture.componentInstance;
		// Provide required inputs before triggering change detection
		component.width = 1920;
		component.height = 1080;
		component.emulator = false;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
