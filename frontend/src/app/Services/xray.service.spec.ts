import { TestBed } from '@angular/core/testing';

import { XrayService } from './xray.service';

describe('XrayService', () => {
  let service: XrayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(XrayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
