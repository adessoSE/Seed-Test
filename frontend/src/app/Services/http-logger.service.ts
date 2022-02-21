import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpResponse } from '@angular/common/http';
import { finalize, tap } from 'rxjs/operators';
import { NGXLogger } from "ngx-logger";

@Injectable()
export class HttpLoggerService implements HttpInterceptor {
  constructor(private logger: NGXLogger) {
  }
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const startTime = Date.now();
    let status: string;
    const callstack = console.trace

    return next.handle(req).pipe(
        tap(
            event => {
              status = '';
              if (event instanceof HttpResponse) {
                status = 'succeeded';
              }
            },
            error => status = 'failed'
        ),
        finalize(() => {
          const elapsedTime = Date.now() - startTime;
          const message = req.method + " " + req.urlWithParams +" "+ status
              + " in " + elapsedTime + "ms";

          this.logDetails('log-front', req.method, req.urlWithParams, status, elapsedTime, callstack);
        })
    );
  }
  private logDetails(msg: string, method, url, status, time, trace) {
      const detail = {'reqMethod': method, 'reqURL': url, 'status': status, "reqRT":time}
      this.logger.log(msg, detail)
      this.logger.trace(msg, detail,{'trace': trace});
  }
}