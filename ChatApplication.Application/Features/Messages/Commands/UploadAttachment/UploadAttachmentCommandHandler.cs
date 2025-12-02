using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Features.Messages.Commands.UploadAttachment;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Messages.Commands.UploadAttachment
{
    public class UploadAttachmentCommandHandler : IRequestHandler<UploadAttachmentCommand, UploadAttachmentCommandResponse>
    {
        private readonly IWebHostEnvironment _environment;
        private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        private static readonly string[] AllowedFileExtensions = { ".pdf", ".doc", ".docx", ".txt", ".xlsx", ".zip", ".rar" };
        private static readonly string[] AllowedVideoExtensions = { ".mp4", ".webm", ".mov", ".avi" };
        private const long MaxFileSize = 10 * 1024 * 1024; 

        public UploadAttachmentCommandHandler(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public async Task<UploadAttachmentCommandResponse> Handle(UploadAttachmentCommand request, CancellationToken cancellationToken)
        {
            var file = request.File;

            if (file == null || file.Length == 0)
            {
                throw new ValidationException(nameof(request.File), "Dosya bulunamadı.");
            }

            if (file.Length > MaxFileSize)
            {
                throw new ValidationException(nameof(request.File), "Dosya boyutu 10MB'dan büyük olamaz.");
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            MessageType messageType;
            string folderName;

            if (Array.Exists(AllowedImageExtensions, e => e == extension))
            {
                messageType = MessageType.Image;
                folderName = "images";
            }
            else if (Array.Exists(AllowedFileExtensions, e => e == extension))
            {
                messageType = MessageType.File;
                folderName = "files";
            }
            else if (Array.Exists(AllowedVideoExtensions, e => e == extension))
            {
                messageType = MessageType.Video;
                folderName = "videos";
            }
            else
            {
                throw new ValidationException(nameof(request.File), "Desteklenmeyen dosya formatı.");
            }

            var webRootPath = _environment.WebRootPath;
            if (string.IsNullOrEmpty(webRootPath))
            {
                webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
            }

            var uploadsFolder = Path.Combine(webRootPath, "uploads", "messages", folderName);
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            // Let exceptions bubble to GlobalExceptionHandlerMiddleware
            await using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream, cancellationToken);
            }

            var url = $"/uploads/messages/{folderName}/{fileName}";

            return new UploadAttachmentCommandResponse
            {
                IsSuccess = true,
                Message = "Dosya başarıyla yüklendi.",
                AttachmentUrl = url,
                AttachmentName = file.FileName,
                AttachmentSize = file.Length,
                Type = messageType
            };
        }
    }
}