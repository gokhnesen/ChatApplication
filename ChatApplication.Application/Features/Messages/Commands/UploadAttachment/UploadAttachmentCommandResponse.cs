using ChatApplication.Domain.Entities;

namespace ChatApplication.Application.Features.Messages.Commands.UploadAttachment
{
    public class UploadAttachmentCommandResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long AttachmentSize { get; set; }
        public MessageType? Type { get; set; }
    }
}