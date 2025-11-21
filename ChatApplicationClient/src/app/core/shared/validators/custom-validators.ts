// src/app/shared/validators/custom-validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup } from '@angular/forms';

export class CustomValidators {

  /**
   * Metin alanının boş olup olmadığını veya sadece boşluklardan oluşup oluşmadığını kontrol eder.
   * Eğer metin sadece boşluklardan oluşuyorsa veya tamamen boşsa geçersizdir.
   */
  static notWhitespace(control: AbstractControl): ValidationErrors | null {
    if (typeof control.value !== 'string' && control.value !== null && control.value !== undefined) {
        return null; // String olmayan değerler için bu validasyonu uygulamıyoruz
    }
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'notWhitespace': true };
  }

  /**
   * Email formatının geçerli olup olmadığını kontrol eder.
   * Daha güçlü bir regex kullanır.
   */
  static emailFormat(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    // RFC 5322 standardına yakın, daha kapsamlı bir email regex'i
    const emailRegex = new RegExp(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
    const isValid = emailRegex.test(control.value.toLowerCase());
    return isValid ? null : { 'emailFormat': true };
  }

  /**
   * Minimum uzunluk kontrolü yapar.
   */
  static minLength(minLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const isValid = control.value.length >= minLength;
      return isValid ? null : { 'minLength': { requiredLength: minLength, actualLength: control.value.length } };
    };
  }

  /**
   * Maksimum uzunluk kontrolü yapar.
   */
  static maxLength(maxLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const isValid = control.value.length <= maxLength;
      return isValid ? null : { 'maxLength': { requiredLength: maxLength, actualLength: control.value.length } };
    };
  }

  /**
   * Parolanın belirli kriterleri (en az 1 büyük harf, 1 küçük harf, 1 sayı, 1 özel karakter ve minimum uzunluk) karşılayıp karşılamadığını kontrol eder.
   * Not: Minimum uzunluk burada da kontrol ediliyor, Validators.minLength ile çakışmaması için dikkatli kullanılmalı.
   */
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


  /**
   * İki alanın değerlerinin eşleşip eşleşmediğini kontrol eder.
   * Genellikle parola ve parola tekrarı gibi alanlar için kullanılır.
   * Bu validatör genellikle FormGroup'a atanır.
   */
  static matchFields(controlName1: string, controlName2: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const control1 = formGroup.get(controlName1);
      const control2 = formGroup.get(controlName2);

      if (!control1 || !control2) {
        return null; // Kontroller bulunamazsa validasyon yapma
      }

      // Eğer control2'de zaten bir hata varsa, onu koru ve sadece eşleşme hatasını ekle
      if (control1.value !== control2.value) {
        control2.setErrors({ ...control2.errors, 'matchFields': true });
        return { 'matchFields': true };
      } else {
        // Eğer eşleşiyorsa ve matchFields hatası varsa, onu kaldır
        if (control2.errors && control2.errors['matchFields']) {
          const errors = { ...control2.errors };
          delete errors['matchFields'];
          control2.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      }
    };
  }

  /**
   * Dosya seçici için maksimum dosya boyutu validasyonu.
   * @param maxSizeInBytes Maksimum dosya boyutu (byte cinsinden)
   */
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

  /**
   * Dosya seçici için izin verilen dosya tipleri validasyonu.
   * @param allowedTypes İzin verilen MIME tipleri dizisi (örn: ['image/jpeg', 'image/png'])
   */
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