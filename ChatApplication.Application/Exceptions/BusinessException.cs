using System;

namespace ChatApplication.Application.Exceptions
{
    public class BusinessException : BaseException
    {
        public BusinessException(string code, string message, string userFriendlyMessage)
            : base(code, message, userFriendlyMessage)
        {
        }

        public BusinessException(string message, string userFriendlyMessage)
            : base("BUSINESS_ERROR", message, userFriendlyMessage)
        {
        }
    }
}