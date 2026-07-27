import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { Block } from '@shared/models/Block';
import { AddBlockFormComponent } from './add-block-form.component';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';

describe('AddBlockFormComponent', () => {
	let component: AddBlockFormComponent;
	let fixture: ComponentFixture<AddBlockFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ AddBlockFormComponent, LayoutModalComponent ],
			imports: [HttpClientTestingModule, MatSnackBarModule]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(AddBlockFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
	describe('updateBlock', () => {
		it('should update the block', () => {
			// Set up a selected block so updateBlock() can access its properties
			const mockBlock: Block = {
				_id: '123',
				name: 'Test Block',
				stepDefinitions: { given: [], when: [], then: [], example: [] } as any
			};
			component.selectedBlock = mockBlock;

			// Set newBlockName so the else-branch (which calls blockService.updateBlock) is entered
			component.newBlockName = 'Updated Block Name';
			component.saveBlockButtonDisable = false;

			vi.spyOn(component.blockService, 'updateBlock').mockReturnValue(of(mockBlock));
			component.updateBlock();
			expect(component.blockService.updateBlock).toHaveBeenCalled();
		});
	});
});
