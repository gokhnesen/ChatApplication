using System.Collections.Generic;

namespace ChatApplication.Application.Features.User.Commands.DeleteUser
{
    public class DeleteUserCommandResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Errors { get; set; } = new List<string>();
    }
}