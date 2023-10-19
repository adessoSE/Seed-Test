import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WindowSizeDialogComponent } from './window-size-dialog.component';

describe('WindowSizeDialogComponent', () => {
  let component: WindowSizeDialogComponent;
  let fixture: ComponentFixture<WindowSizeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WindowSizeDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WindowSizeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
