using ChatApplication.Application.Features.User.Commands;
using ChatApplication.Application.Features.User.Commands.UpdateUserProfile;
using ChatApplication.Application.Features.User.Queries.GetUsers;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System;
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
        private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };
        private const long MaxFileSize = 5 * 1024 * 1024; // 5 MB

        public UserController(SignInManager<ApplicationUser> signInManager, IWebHostEnvironment environment)
        {
            _signInManager = signInManager;
            _environment = environment;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
        {
            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpPut("update-profile")]
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
            return Ok(new { IsAuthenticated = User.Identity?.IsAuthenticated });
        }

        [HttpGet("user-info")]
        public async Task<ActionResult> GetUserInfo()
        {
            if (User.Identity?.IsAuthenticated == false) return NoContent();
            var user = await _signInManager.UserManager.GetUserAsync(User);
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

        [HttpGet("list")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? excludeUserId = null,
            [FromQuery] int? pageNumber = null,
            [FromQuery] int? pageSize = null)
        {
            var query = new GetUsersQuery
            {
                SearchTerm = searchTerm,
                ExcludeUserId = excludeUserId,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var response = await Mediator.Send(query);
            return Ok(new { IsSuccess = true, Data = response });
        }
    }
}
