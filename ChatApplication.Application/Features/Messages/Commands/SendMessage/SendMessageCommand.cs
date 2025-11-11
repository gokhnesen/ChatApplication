using ChatApplication.Domain.Entities;
using MediatR;

namespace ChatApplication.Application.Features.Messages.Commands.SendMessage
{
    public class SendMessageCommand : IRequest<SendMessageCommandResponse>
    {
        public string SenderId { get; set; }
        public string ReceiverId { get; set; }
        public string Content { get; set; }
        
        public MessageType Type { get; set; } = MessageType.Text;
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long? AttachmentSize { get; set; }
    }
}
