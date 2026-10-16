import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { Observable, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable()
export class HttpLoggerInterceptor implements HttpInterceptor {
	private logger = inject(NGXLogger);
	private notification = inject(NotificationService);

	intercept(
		req: HttpRequest<unknown>,
		next: HttpHandler
	): Observable<HttpEvent<unknown>> {
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
				if (err.status === 429) {
					console.warn('[RateLimit]', err.status, err.url);
					const message = err.url?.includes('/api/log')
						? 'Rate limit on logging — requests will be suppressed'
						: 'Too many requests — please wait a moment';
					this.notification.warning(message, 'Rate Limit Exceeded');
					return throwError(() => err);
				}
				if (err.status == HttpStatusCode.Unauthorized) {
				// A 401 on POST /user/update/:id with a *wrong current password* is a
				// credential-validation outcome for that specific form — NOT a session
				// expiry. It must be surfaced as an inline form error instead of bouncing
				// the user to /login, so the account-management component can handle it.
				// The two 401s are told apart by response body: a failed password check
				// throws AppError.unauthorized('Current password is incorrect') in the
				// controller (rendered by the global error handler as { error: ... }),
				// whereas a missing/expired session is rejected by the isAuthenticated
				// middleware with { error: 'Unauthorized: Please log in.' } *before* the
				// controller runs. Only the latter may trigger the re-auth redirect.
					const body = err.error as { error?: string } | undefined;
					const isWrongCurrentPassword =
						req.method === 'POST' &&
						/\/user\/update\/[A-Za-z0-9]+$/.test(req.url) &&
						body?.error === 'Current password is incorrect';
					if (!isWrongCurrentPassword) {
						window.localStorage.removeItem('login');
						if (
							window.location.pathname != '/login' &&
						window.location.pathname != '/resetpasswordconfirm'
						)
							window.location.href = '/login';
					}
				}
				console.error(err);
				return throwError(() => err);
			})
		);
	}
}
