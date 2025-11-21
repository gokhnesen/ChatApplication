using ChatApplication.Application.Features.User.Commands.ChangePassword;
using ChatApplication.Application.Features.User.Commands.Register;
using ChatApplication.Application.Features.User.Commands.UpdateUserProfile;
using ChatApplication.Application.Features.User.Queries.GetUsers;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.MicrosoftAccount;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

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

        // UserController.cs içerisine ekle

        [HttpGet("external-login")]
        [AllowAnonymous]
        public IActionResult ExternalLogin(string provider, string returnUrl = null)
        {
            // 1. Kullanıcıyı Google veya Microsoft'a yönlendir
            var redirectUrl = Url.Action(nameof(ExternalLoginCallback), "User", new { returnUrl });
            var properties = _signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl);
            return Challenge(properties, provider);
        }

        [HttpGet("external-login-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> ExternalLoginCallback(string returnUrl = null, string remoteError = null)
        {
            returnUrl = returnUrl ?? "/"; // Frontend ana sayfası

            // 2. Google'dan hata döndü mü?
            if (remoteError != null)
            {
                return BadRequest(new { Message = $"Harici sağlayıcı hatası: {remoteError}" });
            }

            // 3. Google/Microsoft'tan gelen bilgileri al
            var info = await _signInManager.GetExternalLoginInfoAsync();
            if (info == null)
            {
                return BadRequest(new { Message = "Harici giriş bilgisi yüklenemedi." });
            }

            // 4. Kullanıcı daha önce bu Google hesabıyla giriş yapmış mı? (Login tablosunda var mı?)
            var signInResult = await _signInManager.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, isPersistent: true, bypassTwoFactor: true);

            if (signInResult.Succeeded)
            {
                // Zaten kayıtlı, cookie oluştu, yönlendir
                // YÖNLENDİRME DÜZELTMESİ YAPILDI:
                // Frontend'in cookie'yi kontrol etmesi için /login'e özel parametreyle yönlendir.
                return Redirect($"https://localhost:4200/login?externalAuth=true");
            }

            if (signInResult.IsLockedOut)
            {
                return BadRequest(new { Message = "Hesap kilitli." });
            }

            // 5. Kullanıcı yoksa, yeni hesap oluştur (Auto-Register)
            var email = info.Principal.FindFirstValue(ClaimTypes.Email);
            var name = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? "User";
            var surname = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? "";

            // Eğer email de yoksa (bazı providerlar vermeyebilir) hata dön
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest(new { Message = "Email bilgisi alınamadı." });
            }

            // 5.1. Bu email ile normal kayıt olmuş biri var mı?
            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
            {
                // Kullanıcı tamamen yeni, oluşturalım
                user = new ApplicationUser
                {
                    UserName = email, // Genelde email username olarak kullanılır
                    Email = email,
                    Name = name,
                    LastName = surname,
                    FriendCode = GenerateFriendCode(), // Senin zorunlu alanın
                    ProfilePhotoUrl = null,
                    EmailConfirmed = true // Google'dan geldiyse onaylı sayabiliriz
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    return BadRequest(new { Message = "Kullanıcı oluşturulamadı", Errors = createResult.Errors });
                }
            }

            // 5.2. Kullanıcı (yeni veya eski) ile Google hesabını eşleştir (AspNetUserLogins tablosuna yazar)
            var addLoginResult = await _userManager.AddLoginAsync(user, info);
            if (!addLoginResult.Succeeded)
            {
                return BadRequest(new { Message = "Google hesabı sisteme eklenemedi." });
            }

            // 6. Giriş yap (Cookie oluştur)
            await _signInManager.SignInAsync(user, isPersistent: true);


            // Frontend'e başarılı dönüş
            // YÖNLENDİRME DÜZELTMESİ YAPILDI:
            // Kullanıcıyı direkt chat ekranına değil, /login'e özel parametreyle yönlendiriyoruz.
            return Redirect("https://localhost:4200/login?externalAuth=true");
        }

        // Helper method (Senin entity yapına göre)
        private string GenerateFriendCode()
        {
            // Basit bir örnek, çakışma kontrolü yapman gerekebilir
            return Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
        }


        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordCommand command)
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
                return response.IsSuccess ? Ok(response) : BadRequest(response);
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

    }
}