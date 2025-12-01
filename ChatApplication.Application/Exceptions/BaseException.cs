using System;

namespace ChatApplication.Application.Exceptions
{
    public abstract class BaseException : Exception
    {
        public string Code { get; }
        public string UserFriendlyMessage { get; }

        protected BaseException(string code, string message, string userFriendlyMessage) 
            : base(message)
        {
            Code = code;
            UserFriendlyMessage = userFriendlyMessage;
        }

        protected BaseException(string code, string message, string userFriendlyMessage, Exception innerException) 
            : base(message, innerException)
        {
            Code = code;
            UserFriendlyMessage = userFriendlyMessage;
        }
    }
}