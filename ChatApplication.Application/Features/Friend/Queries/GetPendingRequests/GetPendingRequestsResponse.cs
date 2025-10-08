using System;

namespace ChatApplication.Application.Features.Friend.Queries.GetPendingRequests
{
    public class GetPendingRequestsResponse
    {
        public Guid FriendshipId { get; set; }
        public string SenderId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string SenderLastName { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = string.Empty;
        public DateTime RequestDate { get; set; }
    }
}