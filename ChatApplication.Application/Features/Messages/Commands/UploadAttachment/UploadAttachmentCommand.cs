using MediatR;
using Microsoft.AspNetCore.Http;

namespace ChatApplication.Application.Features.Messages.Commands.UploadAttachment
{
    public class UploadAttachmentCommand : IRequest<UploadAttachmentCommandResponse>
    {
        public IFormFile? File { get; set; }
    }
}