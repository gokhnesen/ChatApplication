using ChatApplication.Application.Features.Messages.Commands.SendAIMessage;
using ChatApplication.Application.Features.Messages.Commands.SendMessage;
using ChatApplication.Application.Features.Messages.Commands.UploadAttachment;
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
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageCommand command)
        {
            var response = await Mediator.Send(command);
            return Ok(response);
        }

        [HttpPost("upload-attachment")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadAttachment([FromForm] UploadAttachmentCommand command)
        {
            var response = await Mediator.Send(command);
            return Ok(response);
        }

        [HttpGet("{userId1}/{userId2}")]
        public async Task<IActionResult> GetMessages(string userId1, string userId2)
        {
            var query = new GetMessagesQuery { UserId1 = userId1, UserId2 = userId2 };
            var messages = await Mediator.Send(query);
            return Ok(messages);
        }

        [HttpPost("mark-as-read")]
        public async Task<IActionResult> MarkMessagesAsRead([FromBody] MarkMessagesAsReadCommand command)
        {
            var response = await Mediator.Send(command);
            return Ok(response);
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
            var response = await Mediator.Send(command);
            return Ok(response);
        }
    }
}

