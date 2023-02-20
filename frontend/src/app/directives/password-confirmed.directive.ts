import { Directive } from '@angular/core';
import { AbstractControl, UntypedFormGroup, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';

/** 
 * A user's password has to match the user's confirmed password 
*/
export const passwordConfirmedValidator: ValidatorFn = (control: UntypedFormGroup): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  return password && confirmPassword && password.value !== confirmPassword.value ? { 'passwordConfirmed': true } : null;
};

/**
 * Directive to check if the passwords are the same
 */
@Directive({
  selector: '[appPasswordConfirmed]',
  providers: [{ provide: NG_VALIDATORS, useExisting: PasswordConfirmedValidatorDirective, multi: true }]
})
export class PasswordConfirmedValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors {
    return passwordConfirmedValidator(control)
  }
}