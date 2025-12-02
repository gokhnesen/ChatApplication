using ChatApplication.Application.Features.User.Commands.ChangePassword;
using ChatApplication.Application.Features.User.Commands.DeleteUser;
using ChatApplication.Application.Features.User.Commands.ExternalLogin;
using ChatApplication.Application.Features.User.Commands.Register;
using ChatApplication.Application.Features.User.Commands.UpdateUserProfile;
using ChatApplication.Application.Features.User.Commands.UploadPhoto;
using ChatApplication.Application.Features.User.Queries.GetUserInfo;
using ChatApplication.Application.Features.User.Queries.GetUsers;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChatApplicationAPI.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : BaseController
    {
        private readonly SignInManager<ApplicationUser> _signInManager;

        public UserController(
            SignInManager<ApplicationUser> signInManager
        )
        {
            _signInManager = signInManager;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
        {
            var response = await Mediator.Send(command);
            return Ok(response);
        }

        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileCommand command)
        {
            var response = await Mediator.Send(command);
            return Ok(response);
        }

        [HttpPost("upload-profile-photo")]
        [Authorize]
        public async Task<IActionResult> UploadProfilePhoto([FromForm] UploadProfilePhotoCommand command)
        {
            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpGet("auth-status")]
        public ActionResult GetAuthStatus()
        {
            return Ok(new { IsAuthenticated = User.Identity?.IsAuthenticated ?? false });
        }

        [HttpGet("user-info")]
        [Authorize]
        public async Task<ActionResult<GetUserInfoQueryResponse>> GetUserInfo()
        {
            var response = await Mediator.Send(new GetUserInfoQuery());

            if (response == null)
            {
                return Unauthorized(new { Message = "Kullanıcı bulunamadı" });
            }

            return Ok(response);
        }

        [HttpGet("list")]
        [Authorize]
        public async Task<IActionResult> GetUsers([FromQuery] GetUsersQuery query)
        {
            var response = await Mediator.Send(query);
            return Ok(new { IsSuccess = true, Data = response });
        }

        [HttpGet("external-login")]
        [AllowAnonymous]
        public IActionResult ExternalLogin(string provider, string returnUrl = null)
        {
            var redirectUrl = Url.Action(nameof(ExternalLoginCallback), "Auth", new { returnUrl });
            var properties = _signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl);
            return Challenge(properties, provider);
        }

        [HttpGet("external-login-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> ExternalLoginCallback(string returnUrl = null, string remoteError = null)
        {
            var command = new ExternalLoginCommand
            {
                ReturnUrl = returnUrl,
                RemoteError = remoteError
            };

            var response = await Mediator.Send(command);

            return Redirect(response.RedirectUrl);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordCommand command)
        {
            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpDelete("delete-account")]
        [Authorize]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteUserCommand command)
        {
            var response = await Mediator.Send(command);
            return Ok(response);
        }
    }
}