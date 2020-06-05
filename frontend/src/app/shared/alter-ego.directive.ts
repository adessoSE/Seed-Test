import { Directive, forwardRef, Injectable } from '@angular/core';
import {
  AsyncValidator,
  AbstractControl,
  NG_ASYNC_VALIDATORS,
  ValidationErrors
} from '@angular/forms';
import { catchError, map } from 'rxjs/operators';
import { HeroesService } from './heroes.service';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UniqueConfirmPasswordValidator implements AsyncValidator {
  constructor(private heroesService: HeroesService) {}

  validate(
    ctrl: AbstractControl
  ): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return this.heroesService.isConfirmPasswordTaken(ctrl.value).pipe(
      map(isTaken => (isTaken ? { uniqueConfirmPassword: true } : null)),
      catchError(() => of(null))
    );
  }
}

@Directive({
  selector: '[appUniqueConfirmPassword]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: forwardRef(() => UniqueConfirmPasswordValidator),
      multi: true
    }
  ]
})
export class UniqueConfirmPasswordValidatorDirective {
  constructor(private validator: UniqueConfirmPasswordValidator) {}

  validate(control: AbstractControl) {
    this.validator.validate(control);
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/