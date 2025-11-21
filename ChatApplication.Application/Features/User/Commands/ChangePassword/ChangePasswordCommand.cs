using MediatR;

namespace ChatApplication.Application.Features.User.Commands.ChangePassword
{
    public class ChangePasswordCommand : IRequest<ChangePasswordCommandResponse>
    {
        public string UserId { get; set; } = string.Empty;

        public string? CurrentPassword { get; set; }

        public string NewPassword { get; set; } = string.Empty;

        public string? ConfirmPassword { get; set; }
    }
}