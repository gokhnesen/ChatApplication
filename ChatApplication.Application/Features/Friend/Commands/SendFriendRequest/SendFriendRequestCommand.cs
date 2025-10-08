using MediatR;
using System;

namespace ChatApplication.Application.Features.Friend.Commands.SendFriendRequest
{
    public class SendFriendRequestCommand : IRequest<SendFriendRequestResponse>
    {
        public string SenderId { get; set; } = string.Empty;
        public string ReceiverId { get; set; } = string.Empty;
    }
}