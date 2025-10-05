using ChatApplication.Application.Features.User.Commands;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace ChatApplicationAPI.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController(SignInManager<ApplicationUser> signInManager) : BaseController
    {


        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
        {
            if (command == null)
            {
                return BadRequest(new RegisterUserCommandResponse
                {
                    IsSuccess = false,
                    Message = "Geçersiz istek.",
                    Errors = new List<string> { "İstek boş." }
                });
            }
            
            // Log the command data
            Console.WriteLine($"Register request received: Email={command.Email}, Name={command.Name}, LastName={command.LastName}");
            
            if (string.IsNullOrEmpty(command.Email) || 
                string.IsNullOrEmpty(command.Password) || 
                string.IsNullOrEmpty(command.Name) || 
                string.IsNullOrEmpty(command.LastName))
            {
                return BadRequest(new RegisterUserCommandResponse
                {
                    IsSuccess = false,
                    Message = "Gerekli alanlar eksik.",
                    Errors = new List<string> { "Tüm alanlar doldurulmalıdır." }
                });
            }
            
            try
            {
                // Ensure Mediator is not null
                if (Mediator == null)
                {
                    return StatusCode(500, new RegisterUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Sunucu hatası oluştu.",
                        Errors = new List<string> { "Mediator service not available" }
                    });
                }
                
                var response = await Mediator.Send(command);
                Console.WriteLine($"Register response: IsSuccess={response.IsSuccess}, UserId={response.UserId ?? "null"}, Email={response.Email ?? "null"}");
                
                return response.IsSuccess ? Ok(response) : BadRequest(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Register: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new RegisterUserCommandResponse
                {
                    IsSuccess = false,
                    Message = "Sunucu hatası oluştu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        [HttpGet("auth-status")]
        public ActionResult GetAuthStatus()
        {
            return Ok(new { IsAuthenticated = User.Identity?.IsAuthenticated });
        }


    }
}
