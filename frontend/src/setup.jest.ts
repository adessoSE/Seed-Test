/* Polyfill TextEncoder/TextDecoder for jsdom (needed by jsPDF and similar libs) */
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import 'zone.js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import {
	BrowserDynamicTestingModule,
	platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

TestBed.initTestEnvironment(
	BrowserDynamicTestingModule,
	platformBrowserDynamicTesting()
);