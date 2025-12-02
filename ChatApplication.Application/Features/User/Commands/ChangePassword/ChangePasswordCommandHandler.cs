using ChatApplication.Application.Exceptions;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ValidationException = ChatApplication.Application.Exceptions.ValidationException;

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
            if (request == null)
            {
                throw new ValidationException(nameof(request), "Geçersiz istek.");
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                throw new NotFoundException(nameof(ApplicationUser), request.UserId);
            }

            var hasPassword = await _userManager.HasPasswordAsync(user);

            IdentityResult result;
            if (hasPassword)
            {
                if (string.IsNullOrEmpty(request.CurrentPassword))
                {
                    throw new ValidationException(nameof(request.CurrentPassword), "Mevcut şifre gereklidir.");
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
                    Message = "Şifre başarıyla güncellendi."
                };
            }

            var errors = result.Errors.Select(e => e.Description).Where(d => !string.IsNullOrWhiteSpace(d)).ToList();
            _logger.LogWarning("Password change failed for user {UserId}: {Errors}", user.Id, string.Join(", ", errors));

            throw new BusinessException(
                "PASSWORD_CHANGE_FAILED",
                string.Join("; ", errors),
                "Şifre güncellenemedi. Lütfen girdiğiniz bilgileri kontrol edin.");
        }
    }
}