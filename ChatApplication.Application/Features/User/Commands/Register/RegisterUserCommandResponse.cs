using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Commands.Register
{
    public class RegisterUserCommandResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? Email { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }
}
