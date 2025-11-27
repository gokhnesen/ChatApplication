import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup } from '@angular/forms';

export class CustomValidators {

  static notWhitespace(control: AbstractControl): ValidationErrors | null {
    if (typeof control.value !== 'string' && control.value !== null && control.value !== undefined) {
        return null; 
    }
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'notWhitespace': true };
  }

  static emailFormat(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const emailRegex = new RegExp(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
    const isValid = emailRegex.test(control.value.toLowerCase());
    return isValid ? null : { 'emailFormat': true };
  }

  static minLength(minLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const isValid = control.value.length >= minLength;
      return isValid ? null : { 'minLength': { requiredLength: minLength, actualLength: control.value.length } };
    };
  }

  static maxLength(maxLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const isValid = control.value.length <= maxLength;
      return isValid ? null : { 'maxLength': { requiredLength: maxLength, actualLength: control.value.length } };
    };
  }

  static passwordStrength(minLength: number = 8): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const value = control.value as string;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumeric = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);
      const isLongEnough = value.length >= minLength;

      const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar && isLongEnough;

      if (!passwordValid) {
        const errors: ValidationErrors = {};
        if (!isLongEnough) errors['passwordMinLength'] = { requiredLength: minLength, actualLength: value.length };
        if (!hasUpperCase) errors['passwordUpperCase'] = true;
        if (!hasLowerCase) errors['passwordLowerCase'] = true;
        if (!hasNumeric) errors['passwordNumeric'] = true;
        if (!hasSpecialChar) errors['passwordSpecialChar'] = true;
        return { 'passwordStrength': errors };
      }
      return null;
    };
  }

  static matchFields(controlName1: string, controlName2: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const control1 = formGroup.get(controlName1);
      const control2 = formGroup.get(controlName2);

      if (!control1 || !control2) {
        return null; 
      }

      if (control1.value !== control2.value) {
        control2.setErrors({ ...control2.errors, 'matchFields': true });
        return { 'matchFields': true };
      } else {
        if (control2.errors && control2.errors['matchFields']) {
          const errors = { ...control2.errors };
          delete errors['matchFields'];
          control2.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      }
    };
  }

  static maxFileSize(maxSizeInBytes: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const file = control.value as File;
      if (file && file.size > maxSizeInBytes) {
        return { 'maxFileSize': { requiredSize: maxSizeInBytes, actualSize: file.size } };
      }
      return null;
    };
  }

  static allowedFileTypes(allowedTypes: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const file = control.value as File;
      if (file && allowedTypes.indexOf(file.type) === -1) {
        return { 'allowedFileTypes': { allowed: allowedTypes, actual: file.type } };
      }
      return null;
    };
  }
}