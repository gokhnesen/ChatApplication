using ChatApplication.Application.Features.User.Commands.ChangePassword;
using ChatApplication.Application.Features.User.Commands.DeleteUser;
using ChatApplication.Application.Features.User.Commands.ExternalLogin;
using ChatApplication.Application.Features.User.Commands.Register;
using ChatApplication.Application.Features.User.Commands.UpdateUserProfile;
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
        private readonly IWebHostEnvironment _environment;
        private readonly UserManager<ApplicationUser> _userManager;

        private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };
        private const long MaxFileSize = 5 * 1024 * 1024;

        public UserController(
            SignInManager<ApplicationUser> signInManager,
            IWebHostEnvironment environment,
            UserManager<ApplicationUser> userManager)
        {
            _signInManager = signInManager;
            _environment = environment;
            _userManager = userManager;
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
        public async Task<IActionResult> UploadProfilePhoto([FromForm] ProfilePhotoUploadModelDto model)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { IsSuccess = false, Message = "Kullanıcı girişi yapılmamış." });
                }

                if (model.Photo == null || model.Photo.Length == 0)
                {
                    return BadRequest(new { IsSuccess = false, Message = "Fotoğraf bulunamadı." });
                }

                var webRootPath = _environment.WebRootPath;
                if (string.IsNullOrEmpty(webRootPath))
                {
                    webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
                }

                var uploadsFolder = Path.Combine(webRootPath, "uploads", "profiles");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var extension = Path.GetExtension(model.Photo.FileName).ToLowerInvariant();
                var fileName = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await model.Photo.CopyToAsync(fileStream);
                }

                var url = $"/uploads/profiles/{fileName}";

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { IsSuccess = false, Message = "Kullanıcı veritabanında bulunamadı." });
                }

                user.ProfilePhotoUrl = url;

                var updateResult = await _userManager.UpdateAsync(user);

                if (!updateResult.Succeeded)
                {
                    return StatusCode(500, new { IsSuccess = false, Message = "Veritabanı güncelleme hatası.", Errors = updateResult.Errors });
                }

                return Ok(new
                {
                    IsSuccess = true,
                    Message = "Fotoğraf başarıyla yüklendi.",
                    ProfilePhotoUrl = url
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { IsSuccess = false, Message = "Fotoğraf yüklenirken bir hata oluştu.", Error = ex.Message });
            }
        }

        [HttpGet("auth-status")]
        public ActionResult GetAuthStatus()
        {
            return Ok(new { IsAuthenticated = User.Identity?.IsAuthenticated ?? false });
        }

        [HttpGet("user-info")]
        [Authorize]
        public async Task<ActionResult> GetUserInfo()
        {
            var user = await _signInManager.UserManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { Message = "Kullanıcı bulunamadı" });
            }

            return Ok(new
            {
                user.Id,
                user.Name,
                user.UserName,
                user.LastName,
                user.Email,
                user.ProfilePhotoUrl,
                user.FriendCode
            });
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