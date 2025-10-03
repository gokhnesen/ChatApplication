using ChatApplication.Application.Features.Messages.Commands;
using ChatApplication.Application.Features.Messages.Queries.GetMessages;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ChatApplicationAPI.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
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
            // Gelen değerleri logla
            Console.WriteLine($"GetMessages - userId1: {userId1}, userId2: {userId2}");
            
            var query = new GetMessagesQuery { UserId1 = userId1, UserId2 = userId2 };
            var messages = await Mediator.Send(query);
            
            // Sonuçları logla
            Console.WriteLine($"Bulunan mesaj sayısı: {messages.Count}");
            
            return Ok(messages);
        }
    }
}
