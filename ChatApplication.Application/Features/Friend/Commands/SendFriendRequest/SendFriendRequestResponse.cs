using System;
using System.Collections.Generic;

namespace ChatApplication.Application.Features.Friend.Commands.SendFriendRequest
{
    public class SendFriendRequestResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public Guid? FriendshipId { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }
}