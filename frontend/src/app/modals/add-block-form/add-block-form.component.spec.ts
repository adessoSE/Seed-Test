import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { AddBlockFormComponent } from './add-block-form.component';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component'

describe('AddBlockFormComponent', () => {
  let component: AddBlockFormComponent;
  let fixture: ComponentFixture<AddBlockFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddBlockFormComponent, LayoutModalComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()]
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
      jest.spyOn(component.blockService, 'updateBlock');
      component.updateBlock();
      expect(component.blockService.updateBlock).toHaveBeenCalled();
    });
  });
});
