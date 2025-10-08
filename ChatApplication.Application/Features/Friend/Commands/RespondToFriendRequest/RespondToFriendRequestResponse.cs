using System.Collections.Generic;

namespace ChatApplication.Application.Features.Friend.Commands.RespondToFriendRequest
{
    public class RespondToFriendRequestResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Errors { get; set; } = new List<string>();
    }
}