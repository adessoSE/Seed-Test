import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

const ALTER_EGOS = ['Eric'];

@Injectable({ providedIn: 'root' })
export class HeroesService {
  isConfirmPasswordTaken(confirmPassword: string): Observable<boolean> {
    const isTaken = ALTER_EGOS.includes(confirmPassword);

    return of(isTaken).pipe(delay(400));
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/