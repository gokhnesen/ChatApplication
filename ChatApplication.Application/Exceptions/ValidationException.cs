using System;
using System.Collections.Generic;
using System.Linq;

namespace ChatApplication.Application.Exceptions
{
    public class ValidationException : BaseException
    {
        public IDictionary<string, string[]> Errors { get; }

        public ValidationException(IDictionary<string, string[]> errors)
            : base("VALIDATION_ERROR", "Doğrulama hatası oluştu", "Lütfen girdiğiniz bilgileri kontrol edin.")
        {
            Errors = errors;
        }

        public ValidationException(string propertyName, string errorMessage)
            : base("VALIDATION_ERROR", "Doğrulama hatası oluştu", "Lütfen girdiğiniz bilgileri kontrol edin.")
        {
            Errors = new Dictionary<string, string[]>
            {
                { propertyName, new[] { errorMessage } }
            };
        }
    }
}