import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileManagerComponent } from './file-manager.component';

describe('FileManagerComponent', () => {
  let component: FileManagerComponent;
  let fixture: ComponentFixture<FileManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileManagerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FileManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
