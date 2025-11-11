using MediatR;
using Microsoft.AspNetCore.Http;

namespace ChatApplication.Application.Features.User.Commands.Register
{
    public class RegisterUserCommand : IRequest<RegisterUserCommandResponse>
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;

 
        public string? ProfilePhotoUrl { get; set; }
    }

    public class ProfilePhotoUploadModelDto
    {
        public IFormFile Photo { get; set; } = null!;
    }

}
