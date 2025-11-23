using MediatR;

namespace ChatApplication.Application.Features.User.Commands.DeleteUser
{
    public class DeleteUserCommand : IRequest<DeleteUserCommandResponse>
    {
        public string UserId { get; set; } = string.Empty;

    }
}