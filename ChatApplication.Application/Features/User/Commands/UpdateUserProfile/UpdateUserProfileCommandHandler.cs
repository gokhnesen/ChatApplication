using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

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
          
                _logger.LogInformation("Kullanıcı profili güncelleniyor: {UserId}", request.UserId);

                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    _logger.LogWarning("Kullanıcı bulunamadı: {UserId}", request.UserId);

                }

                // Kullanıcı özelliklerini güncelle
                user.Name = request.Name ?? string.Empty;
                user.LastName = request.LastName ?? string.Empty;
                
                if (!string.IsNullOrEmpty(request.ProfilePhotoUrl))
                {
                    user.ProfilePhotoUrl = request.ProfilePhotoUrl;
                }

                var result = await _userManager.UpdateAsync(user);

                if (result.Succeeded)
                {
                    _logger.LogInformation("Kullanıcı profili başarıyla güncellendi - ID: {Id}", user.Id);
                    
                    return new UpdateUserProfileCommandResponse
                    {
                        Id = user.Id,
                        Name = user.Name,
                        LastName = user.LastName,
                        Email = user.Email ?? string.Empty,
                        ProfilePhotoUrl = user.ProfilePhotoUrl,
                        FriendCode = user.FriendCode
                    };
                }
                else
                {
                    _logger.LogError("Kullanıcı profili güncellenemedi: {Errors}", 
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                  

                }

                return new UpdateUserProfileCommandResponse();


        }
    }
}