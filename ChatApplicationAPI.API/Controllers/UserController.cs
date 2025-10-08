using ChatApplication.Application.Features.User.Commands;
using ChatApplication.Domain.Entities;
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
            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpGet("auth-status")]
        public ActionResult GetAuthStatus()
        {
            return Ok(new { IsAuthenticated = User.Identity?.IsAuthenticated });
        }

        [HttpGet("user-info")]
        public async Task<ActionResult> GetUserInfo()
        {
            if (User.Identity?.IsAuthenticated == false) return NoContent();
            var user = await signInManager.UserManager.GetUserAsync(User);
            return Ok(new
            {
                user.Id,
                user.Name,
                user.UserName,
                user.LastName,
                user.Email,
                user.ProfilePhotoUrl,

            });
        }
    }
}
