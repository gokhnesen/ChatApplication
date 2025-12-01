using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace ChatApplication.Application.Features.User.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, DeleteUserCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager; 
        private readonly IMessageReadRepository _messageReadRepository;
        private readonly IMessageWriteRepository _messageWriteRepository;
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<DeleteUserCommandHandler> _logger;

        public DeleteUserCommandHandler(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IMessageReadRepository messageReadRepository,
            IMessageWriteRepository messageWriteRepository,
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            IHttpContextAccessor httpContextAccessor,
            ILogger<DeleteUserCommandHandler> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _messageReadRepository = messageReadRepository;
            _messageWriteRepository = messageWriteRepository;
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<DeleteUserCommandResponse> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrEmpty(request.UserId))
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "UserId", new[] { "Kullanıcı ID boş olamaz." } }
                });
            }

            var callerId = _httpContextAccessor?.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(callerId))
            {
                throw new UnauthorizedException("Yetkilendirme bilgisi bulunamadı.");
            }

            if (!string.Equals(callerId, request.UserId, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Yetkisiz silme girişimi. CallerId: {CallerId}, TargetUserId: {TargetId}", callerId, request.UserId);
                throw new BusinessException("UNAUTHORIZED_ACTION", "Bu işlemi gerçekleştirme yetkiniz yok. Sadece kendi hesabınızı silebilirsiniz.");
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                throw new NotFoundException($"Kullanıcı bulunamadı (ID: {request.UserId})");
            }

            var userId = user.Id;

            var messagesToDelete = await _messageReadRepository
                .GetAll(tracking: true)
                .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                .ToListAsync(cancellationToken);

            if (messagesToDelete.Any())
            {
                _messageWriteRepository.RemoveRange(messagesToDelete); 
                await _messageWriteRepository.SaveAsync();
                _logger.LogInformation("{Count} mesaj silindi. User: {UserId}", messagesToDelete.Count, userId);
            }

            var friendsToDelete = await _friendReadRepository
                .GetAll(tracking: true)
                .Where(f => f.SenderId == userId || f.ReceiverId == userId)
                .ToListAsync(cancellationToken);

            if (friendsToDelete.Any())
            {
                _friendWriteRepository.RemoveRange(friendsToDelete);
                await _friendWriteRepository.SaveAsync();
                _logger.LogInformation("{Count} arkadaş kaydı silindi. User: {UserId}", friendsToDelete.Count, userId);
            }

            var deleteResult = await _userManager.DeleteAsync(user);

            if (!deleteResult.Succeeded)
            {
                var errors = deleteResult.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
                throw new ValidationException(errors);
            }

            await _signInManager.SignOutAsync();

            _logger.LogInformation("Kullanıcı başarıyla silindi ve oturum kapatıldı: {UserId}", request.UserId);

            return new DeleteUserCommandResponse
            {
                Message = "Hesabınız ve ilgili tüm veriler başarıyla silindi. Oturumunuz kapatıldı."
            };
        }
    }
}