import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StoriesBarComponent } from './stories-bar.component';

describe('StoriesBarComponent', () => {
  let component: StoriesBarComponent;
  let fixture: ComponentFixture<StoriesBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StoriesBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StoriesBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
