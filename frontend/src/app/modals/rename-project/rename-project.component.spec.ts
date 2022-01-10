import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenameProjectComponent } from './rename-project.component';

describe('RenameProjectComponent', () => {
  let component: RenameProjectComponent;
  let fixture: ComponentFixture<RenameProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RenameProjectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RenameProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
