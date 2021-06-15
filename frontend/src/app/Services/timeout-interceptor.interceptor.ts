import { Inject, Injectable, InjectionToken } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

/**
 * Default request timeout specified in the app module
 */
export const DEFAULT_TIMEOUT = new InjectionToken<number>('defaultTimeout');

/**
 * Interceptor to make run requests last for as long as we specify in the header
 * from https://stackoverflow.com/questions/45938931/default-and-specific-request-timeout
 */
@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  constructor(@Inject(DEFAULT_TIMEOUT) protected defaultTimeout: number) {
  }

  /**
   * Intercepts the request and makes the timeout to the specified time
   * @param req 
   * @param next 
   * @returns 
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const timeoutValue = req.headers.get('timeout') || this.defaultTimeout;
    const timeoutValueNumeric = Number(timeoutValue);

    return next.handle(req).pipe(timeout(timeoutValueNumeric));
  }
}