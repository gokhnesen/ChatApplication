using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Commands.ChangePassword
{
    public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, ChangePasswordCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<ChangePasswordCommandHandler> _logger;

        public ChangePasswordCommandHandler(UserManager<ApplicationUser> userManager, ILogger<ChangePasswordCommandHandler> logger)
        {
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<ChangePasswordCommandResponse> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
        {
            try
            {
                if (request == null)
                {
                    return new ChangePasswordCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Geçersiz istek."
                    };
                }

                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return new ChangePasswordCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Kullan?c? bulunamad?."
                    };
                }

                var hasPassword = await _userManager.HasPasswordAsync(user);

                IdentityResult result;
                if (hasPassword)
                {
                    if (string.IsNullOrEmpty(request.CurrentPassword))
                    {
                        return new ChangePasswordCommandResponse
                        {
                            IsSuccess = false,
                            Message = "Mevcut ?ifre gereklidir."
                        };
                    }

                    result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
                }
                else
                {
                    result = await _userManager.AddPasswordAsync(user, request.NewPassword);
                }

                if (result.Succeeded)
                {
                    _logger.LogInformation("User ({UserId}) password changed successfully.", user.Id);
                    return new ChangePasswordCommandResponse
                    {
                        IsSuccess = true,
                        Message = "?ifre ba?ar?yla güncellendi."
                    };
                }
                else
                {
                    var errors = result.Errors.Select(e => e.Description).ToList();
                    _logger.LogWarning("Password change failed for user {UserId}: {Errors}", user.Id, string.Join(", ", errors));
                    return new ChangePasswordCommandResponse
                    {
                        IsSuccess = false,
                        Message = "?ifre güncellenemedi.",
                        Errors = errors
                    };
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error changing password for user {UserId}", request?.UserId);
                return new ChangePasswordCommandResponse
                {
                    IsSuccess = false,
                    Message = "Sunucu hatas? olu?tu.",
                    Errors = new System.Collections.Generic.List<string> { ex.Message }
                };
            }
        }
    }
}