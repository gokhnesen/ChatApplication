using MediatR;

namespace ChatApplication.Application.Features.User.Commands
{
    public class RegisterUserCommand : IRequest<RegisterUserCommandResponse>
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;

        // Profil fotoğrafı URL'si
        public string? ProfilePhotoUrl { get; set; }
    }
}
