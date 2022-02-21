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
    //const callstack = console.trace

    return next.handle(req).pipe(
        tap(
            event => {
              status = 'failed';
              if (event instanceof HttpResponse) {
                status = 'succeeded';
              }
            },
            error => status = 'failed'
        ),
        finalize(() => {
          const endTime = Date.now();
          //const message = req.method + " " + req.urlWithParams +" "+ status + " in " + (endTime - startTime) + "ms";

          const detail = {'reqMethod': req.method, 'reqURL': req.urlWithParams, 'status': status, 'reqStartTime': startTime, 'reqEndTime': endTime}
          this.logger.log('http front log', detail)
        })
    );
  }
}