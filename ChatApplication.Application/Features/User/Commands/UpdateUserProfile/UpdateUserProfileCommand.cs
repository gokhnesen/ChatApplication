using MediatR;

namespace ChatApplication.Application.Features.User.Commands.UpdateUserProfile
{
    public class UpdateUserProfileCommand : IRequest<UpdateUserProfileCommandResponse>
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? ProfilePhotoUrl { get; set; }
    }
}