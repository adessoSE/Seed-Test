import { TestBed } from '@angular/core/testing';

import { HighlightInputService } from './highlight-input.service';

describe('HighlightInputService', () => {
  let service: HighlightInputService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HighlightInputService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
