/**
 * Vitest test setup for Angular zoneless change detection.
 *
 * With provideZonelessChangeDetection(), zone.js is no longer loaded.
 * Angular's TestBed works natively with the scheduler-based CD.
 * No ProxyZone bridge is needed.
 */
