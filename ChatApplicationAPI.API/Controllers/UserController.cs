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
            var response = await Mediator.Send(command);
            if (response.IsSuccess)
            {
                return Ok(response);
            }
            return BadRequest(response);
        }

        [HttpGet("auth-status")]
        public ActionResult GetAuthStatus()
        {
            return Ok(new { IsAuthenticated = User.Identity?.IsAuthenticated });
        }


    }
}
