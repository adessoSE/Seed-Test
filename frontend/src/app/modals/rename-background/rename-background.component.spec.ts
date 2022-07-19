import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenameBackgroundComponent } from './rename-background.component';

describe('RenameBackgroundComponent', () => {
  let component: RenameBackgroundComponent;
  let fixture: ComponentFixture<RenameBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RenameBackgroundComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RenameBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
