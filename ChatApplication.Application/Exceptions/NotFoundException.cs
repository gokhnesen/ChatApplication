using System;

namespace ChatApplication.Application.Exceptions
{
    public class NotFoundException : BaseException
    {
        public NotFoundException(string entityName, object key)
            : base("NOT_FOUND",
                   $"{entityName} ({key}) bulunamadı.",
                   "Aradığınız kayıt bulunamadı.")
        {
        }

        public NotFoundException(string message, string userFriendlyMessage)
            : base("NOT_FOUND", message, userFriendlyMessage)
        {
        }

        public NotFoundException(string message)
            : base("NOT_FOUND", message, "Aradığınız kayıt bulunamadı.")
        {
        }
    }
}