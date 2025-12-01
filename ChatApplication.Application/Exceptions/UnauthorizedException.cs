using System;

namespace ChatApplication.Application.Exceptions
{
    public class UnauthorizedException : BaseException
    {
        public UnauthorizedException(string message = "Yetkisiz erişim")
            : base("UNAUTHORIZED", message, "Bu işlem için yetkiniz bulunmamaktadır.")
        {
        }
    }
}