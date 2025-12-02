using ChatApplication.Application.Exceptions;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using ValidationException = ChatApplication.Application.Exceptions.ValidationException;

namespace ChatApplication.Application.Features.User.Commands.UpdateUserProfile
{
    public class UpdateUserProfileCommandHandler : IRequestHandler<UpdateUserProfileCommand, UpdateUserProfileCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<UpdateUserProfileCommandHandler> _logger;

        public UpdateUserProfileCommandHandler(
            UserManager<ApplicationUser> userManager,
            ILogger<UpdateUserProfileCommandHandler> logger)
        {
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<UpdateUserProfileCommandResponse> Handle(UpdateUserProfileCommand request, CancellationToken cancellationToken)
        {
            if (request == null)
            {
                throw new ValidationException(nameof(request), "Geçersiz istek.");
            }

            _logger.LogInformation("Kullanıcı profili güncelleniyor: {UserId}", request.UserId);

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                _logger.LogWarning("Kullanıcı bulunamadı: {UserId}", request.UserId);
                throw new NotFoundException(nameof(ApplicationUser), request.UserId);
            }

            user.Name = request.Name ?? string.Empty;
            user.LastName = request.LastName ?? string.Empty;
            user.UserName = request.UserName ?? string.Empty;

            if (!string.IsNullOrEmpty(request.ProfilePhotoUrl))
            {
                user.ProfilePhotoUrl = request.ProfilePhotoUrl;
            }

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).Where(d => !string.IsNullOrWhiteSpace(d)).ToList();
                _logger.LogError("Kullanıcı profili güncellenemedi ({UserId}): {Errors}", user.Id, string.Join("; ", errors));

                throw new BusinessException(
                    "USER_PROFILE_UPDATE_FAILED",
                    string.Join("; ", errors),
                    "Profil güncellenemedi. Lütfen bilgilerinizi kontrol edip tekrar deneyin.");
            }

            _logger.LogInformation("Kullanıcı profili başarıyla güncellendi - ID: {Id}", user.Id);

            return new UpdateUserProfileCommandResponse
            {
                Id = user.Id,
                Name = user.Name,
                LastName = user.LastName,
                Email = user.Email ?? string.Empty,
                ProfilePhotoUrl = user.ProfilePhotoUrl,
                FriendCode = user.FriendCode,
                UserName = user.UserName
            };
        }
    }
}