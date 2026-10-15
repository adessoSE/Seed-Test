import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { HighlightInputService } from './highlight-input.service';

const RESOLVE_URL = 'http://localhost:8080/api/story/specialCommands/resolve';

describe('HighlightInputService', () => {
	let service: HighlightInputService;
	let httpMock: HttpTestingController;
	let attached: HTMLElement[] = [];

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		service = TestBed.inject(HighlightInputService);
		httpMock = TestBed.inject(HttpTestingController);
		// resolveSpecialCommand reads the backend URL from localStorage
		localStorage.setItem('url_backend', 'http://localhost:8080/api');
	});

	afterEach(() => {
		localStorage.removeItem('url_backend');
		attached.forEach(el => el.remove());
		attached = [];
		httpMock.verify();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	/** Creates a contenteditable-like div attached to the document so tooltip lookups by id succeed */
	function createField(text: string): HTMLElement {
		const el = document.createElement('div');
		el.textContent = text;
		document.body.appendChild(el);
		attached.push(el);
		return el;
	}

	/** Reads the title the service wrote into the uk-tooltip option of the special-command span */
	function tooltipTitle(el: HTMLElement): string {
		const span = el.querySelector<HTMLElement>('span[id^="specialInputId"]');
		expect(span).not.toBeNull();
		return (JSON.parse(span!.getAttribute('uk-tooltip') ?? '') as { title: string }).title;
	}

	describe('XSS protection (stored step text is untrusted)', () => {

		it('should not create an <img> element from plain step text with an onerror payload', () => {
			const payload = '<img src=x onerror=alert(1)>';
			const field = createField(payload);

			service.highlightInput(field, true);

			// Regression: textContent was assigned to innerHTML unescaped, so the image ran its onerror handler.
			expect(field.querySelector('img')).toBeNull();
			expect(field.textContent).toBe(payload);
		});

		it('should keep the payload as text inside regex highlighting and still create highlight spans', () => {
			const payload = '{Regex:<img src=x onerror=alert(1)>}';
			const field = createField(payload);

			const detected = service.highlightInput(field, true, false, false, 0, 'So I can see the text', true);

			expect(detected).toBe(true);
			expect(field.querySelector('img')).toBeNull();
			expect(field.querySelectorAll('span').length).toBeGreaterThan(0);
			expect(field.textContent).toBe(payload);
		});

		it('should pass the unescaped special command to the API', () => {
			const command = '@@Day,1@@format:a&b<c€€';
			const field = createField(command);

			service.highlightInput(field, true);

			// Escaped text is used for the markup, but the backend must receive the original characters.
			const req = httpMock.expectOne(RESOLVE_URL);
			expect(req.request.body).toEqual({ command });
			req.flush({ resolved: 'resolved' });
			expect(field.querySelector('img')).toBeNull();
			expect(field.textContent).toBe(command);
		});
	});

	describe('special command tooltip (UIkit renders the title as HTML)', () => {
		const command = '@@Day,1@@format:<img src=x onerror=alert(1)>€€';

		it('should show the resolved string in the tooltip, not an object', () => {
			// Regression: the backend answers { resolved }, so the tooltip used to show "[object Object]".
			const field = createField('@@Day,1@@format:Mon€€');

			service.highlightInput(field, true);
			httpMock.expectOne(RESOLVE_URL).flush({ resolved: 'Monday' });

			expect(tooltipTitle(field)).toBe('Monday');
		});

		it('should escape an echoed command in the "Unknown command" tooltip', () => {
			const field = createField(command);

			service.highlightInput(field, true);
			httpMock.expectOne(RESOLVE_URL).flush({ resolved: command });

			expect(tooltipTitle(field)).toBe('Unknown command: @@Day,1@@format:&lt;img src=x onerror=alert(1)&gt;€€');
			expect(field.querySelector('img')).toBeNull();
		});

		it('should escape the backend error message so no markup is created in the tooltip', () => {
			// Regression: the 400 message echoes the command; it was put into the tooltip unescaped.
			const field = createField(command);

			service.highlightInput(field, true);
			httpMock.expectOne(RESOLVE_URL).flush(
				{ error: 'Found: <img src=x onerror=alert(1)>' },
				{ status: 400, statusText: 'Bad Request' }
			);

			expect(tooltipTitle(field)).toBe('Error: Found: &lt;img src=x onerror=alert(1)&gt;');
			expect(field.querySelector('img')).toBeNull();
		});

		it('should keep ";" and ":" from a resolved value inside the title (no option injection)', () => {
			const field = createField('@@Day,1@@format:x€€');

			service.highlightInput(field, true);
			httpMock.expectOne(RESOLVE_URL).flush({ resolved: 'Mon; pos: bottom-left' });

			expect(tooltipTitle(field)).toBe('Mon; pos: bottom-left');
		});
	});
});
