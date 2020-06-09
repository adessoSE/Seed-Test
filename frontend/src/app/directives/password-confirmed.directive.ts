
import { Directive } from '@angular/core';
import { AbstractControl, FormGroup, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';

/** A user's password has to match the user's confirmed password */
export const passwordConfirmedValidator: ValidatorFn = (control: FormGroup): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  return password && confirmPassword && password.value !== confirmPassword.value ? { 'passwordConfirmed': true } : null;
};

@Directive({
  selector: '[appPasswordConfirmed]',
  providers: [{ provide: NG_VALIDATORS, useExisting: PasswordConfirmedValidatorDirective, multi: true }]
})
export class PasswordConfirmedValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors {
    return passwordConfirmedValidator(control)
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/