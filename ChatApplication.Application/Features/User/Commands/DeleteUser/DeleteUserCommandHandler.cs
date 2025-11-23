using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using static System.Net.Mime.MediaTypeNames;

namespace ChatApplication.Application.Features.User.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, DeleteUserCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IMessageReadRepository _messageReadRepository;
        private readonly IMessageWriteRepository _messageWriteRepository;
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<DeleteUserCommandHandler> _logger;

        public DeleteUserCommandHandler(
            UserManager<ApplicationUser> userManager,
            IMessageReadRepository messageReadRepository,
            IMessageWriteRepository messageWriteRepository,
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            IHttpContextAccessor httpContextAccessor,
            ILogger<DeleteUserCommandHandler> logger)
        {
            _userManager = userManager;
            _messageReadRepository = messageReadRepository;
            _messageWriteRepository = messageWriteRepository;
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<DeleteUserCommandResponse> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.UserId))
                {
                    return new DeleteUserCommandResponse { IsSuccess = false, Message = "Geçersiz istek." };
                }

                // Ensure caller can only delete their own account
                var callerId = _httpContextAccessor?.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                               ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("sub")?.Value;

                if (string.IsNullOrEmpty(callerId))
                {
                    _logger.LogWarning("DeleteUser attempt without authenticated caller. RequestUserId: {RequestUserId}", request.UserId);
                    return new DeleteUserCommandResponse { IsSuccess = false, Message = "Yetkilendirme bilgisi bulunamadı." };
                }

                if (!string.Equals(callerId, request.UserId, System.StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Unauthorized delete attempt. CallerId: {CallerId}, TargetUserId: {TargetId}", callerId, request.UserId);
                    return new DeleteUserCommandResponse { IsSuccess = false, Message = "Bu işlemi gerçekleştirme yetkiniz yok." };
                }

                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return new DeleteUserCommandResponse { IsSuccess = false, Message = "Kullanıcı bulunamadı." };
                }

                // Note: password validation REMOVED — user may delete own account using only their UserId.

                // 1) Use existing repository abstractions to delete dependents (messages, friend records)
                var userId = user.Id;

                // Delete messages where user is sender or receiver
                var messagesToDelete = await _messageReadRepository
                    .GetAll(tracking: true)
                    .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                    .ToListAsync(cancellationToken);

                if (messagesToDelete.Any())
                {
                    foreach (var msg in messagesToDelete)
                    {
                        _messageWriteRepository.Remove(msg);
                    }

                    await _messageWriteRepository.SaveAsync();
                    _logger.LogInformation("Deleted {Count} messages for user {UserId} before user deletion.", messagesToDelete.Count, userId);
                }

                // Delete friend entries where user is sender or receiver
                var friendsToDelete = await _friendReadRepository
                    .GetAll(tracking: true)
                    .Where(f => f.SenderId == userId || f.ReceiverId == userId)
                    .ToListAsync(cancellationToken);

                if (friendsToDelete.Any())
                {
                    foreach (var f in friendsToDelete)
                    {
                        _friendWriteRepository.Remove(f);
                    }

                    await _friendWriteRepository.SaveAsync();
                    _logger.LogInformation("Deleted {Count} friend entries for user {UserId} before user deletion.", friendsToDelete.Count, userId);
                }

                // 2) Now delete the user via UserManager
                var deleteResult = await _userManager.DeleteAsync(user);

                if (!deleteResult.Succeeded)
                {
                    var errs = new List<string>();
                    foreach (var e in deleteResult.Errors)
                        errs.Add(e.Description);

                    _logger.LogWarning("Kullanıcı silme başarısız: {UserId} - {Errors}", request.UserId, string.Join(", ", errs));
                    return new DeleteUserCommandResponse { IsSuccess = false, Message = "Kullanıcı silinemedi.", Errors = errs };
                }

                _logger.LogInformation("Kullanıcı silindi: {UserId}", request.UserId);
                return new DeleteUserCommandResponse { IsSuccess = true, Message = "Hesabınız başarıyla silindi." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kullanıcı silinirken hata: {UserId}", request?.UserId);
                return new DeleteUserCommandResponse
                {
                    IsSuccess = false,
                    Message = "Sunucu hatası oluştu.",
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}