using ChatApplication.Domain.Entities;

namespace ChatApplication.Application.Features.Messages.Queries.GetLatestMessage
{
    public class GetLatestMessageResponse
    {
        public string? Id { get; set; }
        public string? SenderId { get; set; }
        public string? ReceiverId { get; set; }
        public string? Content { get; set; }
        public DateTime? SentAt { get; set; }
        public bool IsRead { get; set; }
        public bool HasMessage { get; set; }
        
        public MessageType Type { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long? AttachmentSize { get; set; }
    }
}