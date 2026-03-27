import { TestBed } from '@angular/core/testing';

import { StepValidationService } from './step-validation.service';

describe('StepValidationService', () => {
  let service: StepValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StepValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
