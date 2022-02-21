import { Injectable } from '@angular/core';
import {HttpInterceptor, HttpRequest, HttpHandler, HttpResponse, HttpEvent} from '@angular/common/http';
import { finalize, tap } from 'rxjs/operators';
import { NGXLogger } from "ngx-logger";
import {Observable} from "rxjs";

@Injectable()
export class HttpLoggerInterceptor implements HttpInterceptor {
  constructor(private logger: NGXLogger) {
  }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    let status: string;

    const detail = {'Time': startTime, 'reqMethod': req.method, 'reqURL': req.urlWithParams};
    this.logger.log('sended request', detail, req.headers);

    return next.handle(req).pipe(
        tap( event => {
          status = 'failed';
          if (event instanceof HttpResponse) {
            status = 'succeeded';
          }
            console.log('http-logger tap', event)
        })/*,
        finalize(() => {
          const endTime = Date.now();
          //const message = req.method + " " + req.urlWithParams +" "+ status + " in " + (endTime - startTime) + "ms";

          const detail = {'reqMethod': req.method, 'reqURL': req.urlWithParams, 'status': status, 'reqStartTime': startTime, 'reqEndTime': endTime}
          this.logger.log('got Response', detail)
        })*/
    );
  }
}