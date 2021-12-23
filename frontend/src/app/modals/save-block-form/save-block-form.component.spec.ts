import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveBlockFormComponent } from './save-block-form.component';

describe('SaveBlockFormComponent', () => {
  let component: SaveBlockFormComponent;
  let fixture: ComponentFixture<SaveBlockFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SaveBlockFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SaveBlockFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
