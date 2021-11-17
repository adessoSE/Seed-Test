import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenameStoryComponent } from './rename-story.component';

describe('RenameStoryComponent', () => {
  let component: RenameStoryComponent;
  let fixture: ComponentFixture<RenameStoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RenameStoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RenameStoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
