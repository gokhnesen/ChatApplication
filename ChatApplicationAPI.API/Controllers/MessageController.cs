using ChatApplication.Application.Features.Messages.Commands;
using ChatApplication.Application.Features.Messages.Queries.GetMessages;
using ChatApplication.Application.Features.Messages.Queries.GetLatestMessage;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ChatApplicationAPI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessageController : BaseController
    {
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageCommand command)
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

        [HttpGet("latest/{userId1}/{userId2}")]
        public async Task<IActionResult> GetLatestMessage(string userId1, string userId2)
        {
            var query = new GetLatestMessageQuery { UserId1 = userId1, UserId2 = userId2 };
            var message = await Mediator.Send(query);
            return Ok(message);
        }

        [HttpPut("mark-as-read")]
        public async Task<IActionResult> MarkMessagesAsRead([FromBody] MarkMessagesAsReadCommand command)
        {
            var response = await Mediator.Send(command);
            return Ok(response);
        }
    }
}
