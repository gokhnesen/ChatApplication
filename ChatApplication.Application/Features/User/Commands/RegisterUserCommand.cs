using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Commands
{
    public class RegisterUserCommand : IRequest<RegisterUserCommandResponse>
    {
        public string Name { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }

        public string Password { get; set; }
    }
}
