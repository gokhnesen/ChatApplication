using System;
using ChatApplication.Domain.Entities;

namespace ChatApplication.Application.Features.Messages.Commands.SendMessage
{
    public class SendMessageCommandResponse
    {
        public Guid MessageId { get; set; }
        public string SenderId { get; set; }
        public string ReceiverId { get; set; }
        public string Content { get; set; }
        public DateTime SentAt { get; set; }
        
        public MessageType Type { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long? AttachmentSize { get; set; }
    }
}
