using ChatApplication.Application.Features.Messages.Commands.SendAIMessage;
using ChatApplication.Application.Features.Messages.Commands.SendMessage;
using ChatApplication.Application.Features.Messages.Queries.GetLatestMessage;
using ChatApplication.Application.Features.Messages.Queries.GetMessages;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChatApplicationAPI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessageController : BaseController
    {
        private readonly IWebHostEnvironment _environment;
        private readonly string[] _allowedImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        private readonly string[] _allowedFileExtensions = { ".pdf", ".doc", ".docx", ".txt", ".xlsx", ".zip", ".rar" };
        private readonly string[] _allowedVideoExtensions = { ".mp4", ".webm", ".mov", ".avi" };

        private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB

        public MessageController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageCommand command)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { IsSuccess = false, Message = "Kullanıcı girişi yapılmamış." });
                }

                command.SenderId = userId;
                var response = await Mediator.Send(command);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { IsSuccess = false, Message = "Mesaj gönderilirken hata oluştu.", Error = ex.Message });
            }
        }

        [HttpPost("upload-attachment")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadAttachment(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { IsSuccess = false, Message = "Dosya bulunamadı." });
                }

                if (file.Length > MaxFileSize)
                {
                    return BadRequest(new { IsSuccess = false, Message = "Dosya boyutu 10MB'dan büyük olamaz." });
                }

                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

                MessageType messageType;
                string folderName;

                if (Array.Exists(_allowedImageExtensions, e => e == extension))
                {
                    messageType = MessageType.Image;
                    folderName = "images";
                }
                else if (Array.Exists(_allowedFileExtensions, e => e == extension))
                {
                    messageType = MessageType.File;
                    folderName = "files";
                }
                else if (Array.Exists(_allowedVideoExtensions, e => e == extension))
                {
                    messageType = MessageType.Video;
                    folderName = "videos";
                }
                else
                {
                    return BadRequest(new
                    {
                        IsSuccess = false,
                        Message = "Desteklenmeyen dosya formatı."
                    });
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

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(fileStream);
                }

                var url = $"/uploads/messages/{folderName}/{fileName}";

                return Ok(new
                {
                    IsSuccess = true,
                    Message = "Dosya başarıyla yüklendi.",
                    AttachmentUrl = url,
                    AttachmentName = file.FileName,
                    AttachmentSize = file.Length,
                    Type = messageType
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = "Dosya yüklenirken bir hata oluştu.",
                    Error = ex.Message
                });
            }
        }


        [HttpGet("{userId1}/{userId2}")]
        public async Task<IActionResult> GetMessages(string userId1, string userId2)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (currentUserId != userId1 && currentUserId != userId2)
            {
                return Unauthorized(new { IsSuccess = false, Message = "Bu mesajları görüntüleme yetkiniz yok." });
            }

            var query = new GetMessagesQuery { UserId1 = userId1, UserId2 = userId2 };
            var messages = await Mediator.Send(query);
            return Ok(messages);
        }

        [HttpPost("mark-as-read")]
        public async Task<IActionResult> MarkMessagesAsRead([FromBody] MarkMessagesAsReadCommand command)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { IsSuccess = false, Message = "Kullanıcı girişi yapılmamış." });
                }

                command.UserId = userId;
                var response = await Mediator.Send(command);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { IsSuccess = false, Message = "Mesajlar okundu olarak işaretlenirken hata oluştu.", Error = ex.Message });
            }
        }

        [HttpGet("latest/{userId1}/{userId2}")]
        public async Task<IActionResult> GetLatestMessage(string userId1, string userId2)
        {
            var query = new GetLatestMessageQuery { UserId1 = userId1, UserId2 = userId2 };
            var message = await Mediator.Send(query);
            return Ok(message);
        }


        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] SendAIMessageCommand command)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { IsSuccess = false, Message = "Oturum açmanız gerekiyor." });
                }

                command.UserId = userId;
                var response = await Mediator.Send(command);

 
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { IsSuccess = false, Message = "Yapay zeka servisiyle iletişimde hata oluştu.", Error = ex.Message });
            }
        }
    }
}

