import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { Observable, throwError } from 'rxjs';

@Injectable()
export class HttpLoggerInterceptor implements HttpInterceptor {
	private logger = inject(NGXLogger);

	constructor() {
		console.log('constructor http interceptor');
	}
	intercept(
		req: HttpRequest<any>,
		next: HttpHandler
	): Observable<HttpEvent<any>> {
		const startTime = Date.now();

		const detail = {
			Time: startTime,
			reqMethod: req.method,
			reqURL: req.urlWithParams
		};
		this.logger.log('sent request', detail, req.headers);

		return next.handle(req).pipe(
			tap((event) => {
				console.debug('http-logger tap', event);
			}),
			catchError((err: HttpErrorResponse) => {
				if (err.status == HttpStatusCode.Unauthorized) {
					window.localStorage.removeItem('login');
					if (
						window.location.pathname != '/login' &&
            window.location.pathname != '/resetpasswordconfirm'
					)
						window.location.href = '/login';
				}
				console.error(err);
				return throwError(() => err);
			})
		);
	}
}
