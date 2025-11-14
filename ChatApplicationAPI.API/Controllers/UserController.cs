using ChatApplication.Application.Features.User.Commands.Register;
using ChatApplication.Application.Features.User.Commands.UpdateUserProfile;
using ChatApplication.Application.Features.User.Queries.GetUsers;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.MicrosoftAccount;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

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
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileCommand command)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new
                    {
                        IsSuccess = false,
                        Message = "Kullanıcı girişi yapılmamış."
                    });
                }

                command.UserId = userId;

                var response = await Mediator.Send(command);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = "Sunucu hatası oluştu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        [HttpPost("upload-profile-photo")]
        [Authorize]
        public async Task<IActionResult> UploadProfilePhoto([FromForm] ProfilePhotoUploadModelDto model)
        {
            try
            {
                if (model.Photo == null || model.Photo.Length == 0)
                {
                    return BadRequest(new { IsSuccess = false, Message = "Fotoğraf bulunamadı." });
                }

                if (model.Photo.Length > MaxFileSize)
                {
                    return BadRequest(new { IsSuccess = false, Message = "Dosya boyutu 5MB'dan büyük olamaz." });
                }

                var extension = Path.GetExtension(model.Photo.FileName).ToLowerInvariant();
                if (!Array.Exists(_allowedExtensions, e => e == extension))
                {
                    return BadRequest(new { IsSuccess = false, Message = "Sadece .jpg, .jpeg, .png ve .gif dosyaları kabul edilmektedir." });
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

                var fileName = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await model.Photo.CopyToAsync(fileStream);
                }

                var url = $"/uploads/profiles/{fileName}";

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
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? excludeUserId = null,
            [FromQuery] int? pageNumber = null,
            [FromQuery] int? pageSize = null,
            [FromQuery] bool? includeBlocked = null,
            [FromQuery] bool onlyBlocked = false)
        {
            if (string.IsNullOrEmpty(excludeUserId) && User.Identity?.IsAuthenticated == true)
            {
                excludeUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            }

            var query = new GetUsersQuery
            {
                SearchTerm = searchTerm,
                ExcludeUserId = excludeUserId,
                PageNumber = pageNumber,
                PageSize = pageSize,
                IncludeBlocked = includeBlocked,
                OnlyBlocked = onlyBlocked
            };

            var response = await Mediator.Send(query);
            return Ok(new { IsSuccess = true, Data = response });
        }

        // ✅ Google Login - Başlangıç
        [HttpGet("google-login")]
        [AllowAnonymous]
        public IActionResult GoogleLogin()
        {
            var redirectUrl = Url.Action(nameof(GoogleCallback), "User", null, Request.Scheme);
            var properties = _signInManager.ConfigureExternalAuthenticationProperties(
                GoogleDefaults.AuthenticationScheme, redirectUrl);
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        // ✅ Google Callback
        [HttpGet("google-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleCallback()
        {
            try
            {
                var info = await _signInManager.GetExternalLoginInfoAsync();
                if (info == null)
                {
                    return Redirect("http://localhost:4200/login?error=external_auth_failed");
                }

                // ✅ Email'i al
                var email = info.Principal.FindFirstValue(ClaimTypes.Email);
                if (string.IsNullOrEmpty(email))
                {
                    return Redirect("http://localhost:4200/login?error=no_email");
                }

                // ✅ Kullanıcıyı bul veya oluştur
                var user = await _userManager.FindByEmailAsync(email);

                if (user == null)
                {
                    // ✅ Yeni kullanıcı oluştur
                    user = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        Name = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? "User",
                        LastName = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? "",
                        FriendCode = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
                        EmailConfirmed = true
                    };

                    var createResult = await _userManager.CreateAsync(user);
                    if (!createResult.Succeeded)
                    {
                        return Redirect("http://localhost:4200/login?error=user_creation_failed");
                    }

                    // ✅ External login bağla
                    await _userManager.AddLoginAsync(user, info);
                }
                else
                {
                    // ✅ Mevcut kullanıcıya external login ekle (yoksa)
                    var existingLogins = await _userManager.GetLoginsAsync(user);
                    if (!existingLogins.Any(l => l.LoginProvider == info.LoginProvider && l.ProviderKey == info.ProviderKey))
                    {
                        await _userManager.AddLoginAsync(user, info);
                    }
                }

                // ✅ Sign in (cookie set edilir)
                await _signInManager.SignInAsync(user, isPersistent: true);

                // ✅ Angular chat sayfasına yönlendir
                return Redirect("http://localhost:4200/chat");
            }
            catch (Exception ex)
            {
                // ✅ Hata logla
                Console.WriteLine($"Google callback error: {ex.Message}");
                return Redirect("http://localhost:4200/login?error=server_error");
            }
        }

        // ✅ Microsoft Login - Başlangıç
        [HttpGet("microsoft-login")]
        [AllowAnonymous]
        public IActionResult MicrosoftLogin()
        {
            var redirectUrl = Url.Action(nameof(MicrosoftCallback), "User", null, Request.Scheme);
            var properties = _signInManager.ConfigureExternalAuthenticationProperties(
                MicrosoftAccountDefaults.AuthenticationScheme, redirectUrl);
            return Challenge(properties, MicrosoftAccountDefaults.AuthenticationScheme);
        }

        // ✅ Microsoft Callback
        [HttpGet("microsoft-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> MicrosoftCallback()
        {
            try
            {
                var info = await _signInManager.GetExternalLoginInfoAsync();
                if (info == null)
                {
                    return Redirect("http://localhost:4200/login?error=external_auth_failed");
                }

                var email = info.Principal.FindFirstValue(ClaimTypes.Email);
                if (string.IsNullOrEmpty(email))
                {
                    return Redirect("http://localhost:4200/login?error=no_email");
                }

                var user = await _userManager.FindByEmailAsync(email);

                if (user == null)
                {
                    user = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        Name = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? "User",
                        LastName = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? "",
                        FriendCode = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
                        EmailConfirmed = true
                    };

                    var createResult = await _userManager.CreateAsync(user);
                    if (!createResult.Succeeded)
                    {
                        return Redirect("http://localhost:4200/login?error=user_creation_failed");
                    }

                    await _userManager.AddLoginAsync(user, info);
                }
                else
                {
                    var existingLogins = await _userManager.GetLoginsAsync(user);
                    if (!existingLogins.Any(l => l.LoginProvider == info.LoginProvider && l.ProviderKey == info.ProviderKey))
                    {
                        await _userManager.AddLoginAsync(user, info);
                    }
                }

                await _signInManager.SignInAsync(user, isPersistent: true);

                return Redirect("http://localhost:4200/chat");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Microsoft callback error: {ex.Message}");
                return Redirect("http://localhost:4200/login?error=server_error");
            }
        }
    }
}