using MediatR;
using System;

namespace ChatApplication.Application.Features.Friend.Commands.RespondToFriendRequest
{
    public class RespondToFriendRequestCommand : IRequest<RespondToFriendRequestResponse>
    {
        public Guid FriendshipId { get; set; }
        public string ReceiverId { get; set; } = string.Empty;
        public bool Accept { get; set; }
    }
}