using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Features.User.Commands.UploadPhoto;
    using ChatApplication.Domain.Entities;
    using MediatR;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Identity;
    using System;
    using System.IO;
    using System.Security.Claims;
    using System.Threading;
    using System.Threading.Tasks;

    public class UploadProfilePhotoCommandHandler : IRequestHandler<UploadProfilePhotoCommand, UploadProfilePhotoCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IWebHostEnvironment _environment;

        public UploadProfilePhotoCommandHandler(
            UserManager<ApplicationUser> userManager,
            IHttpContextAccessor httpContextAccessor,
            IWebHostEnvironment environment)
        {
            _userManager = userManager;
            _httpContextAccessor = httpContextAccessor;
            _environment = environment;
        }

        public async Task<UploadProfilePhotoCommandResponse> Handle(UploadProfilePhotoCommand request, CancellationToken cancellationToken)
        {
            var userId = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedException();
            }

            if (request.Photo == null || request.Photo.Length == 0)
            {
                throw new ValidationException(nameof(request.Photo), "Fotoğraf bulunamadı.");
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

            var extension = Path.GetExtension(request.Photo.FileName).ToLowerInvariant();

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await request.Photo.CopyToAsync(fileStream, cancellationToken);
            }

            var url = $"/uploads/profiles/{fileName}";

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new NotFoundException(nameof(ApplicationUser), userId);
            }

            user.ProfilePhotoUrl = url;
            var updateResult = await _userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
            {
                var errors = updateResult.Errors?.Select(e => e.Description).Where(s => !string.IsNullOrWhiteSpace(s)).ToList() ?? new System.Collections.Generic.List<string>();
                var joined = errors.Any() ? string.Join("; ", errors) : "Bilinmeyen hata.";
                throw new BusinessException("USER_UPDATE_FAILED", joined, "Profil fotoğrafı kaydedilemedi. Lütfen tekrar deneyin.");
            }

            return new UploadProfilePhotoCommandResponse
            {
                IsSuccess = true,
                Message = "Fotoğraf başarıyla yüklendi.",
                ProfilePhotoUrl = url
            };
        }
    }