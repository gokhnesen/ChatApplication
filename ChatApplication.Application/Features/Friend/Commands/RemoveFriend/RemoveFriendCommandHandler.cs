using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces.Friend;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;


namespace ChatApplication.Application.Features.Friend.Commands.RemoveFriend
{
    public class RemoveFriendCommandHandler : IRequestHandler<RemoveFriendCommand, RemoveFriendCommandResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<RemoveFriendCommandHandler> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string AiUserId = "ai-bot";

        public RemoveFriendCommandHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<RemoveFriendCommandHandler> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<RemoveFriendCommandResponse> Handle(RemoveFriendCommand request, CancellationToken cancellationToken)
        {
            var callerId = string.IsNullOrWhiteSpace(request.UserId)
                ? _httpContextAccessor?.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                : request.UserId;

            if (string.IsNullOrWhiteSpace(callerId))
            {
                _logger.LogWarning("Unauthorized remove friend attempt (no user id in context)");
                throw new UnauthorizedException("Kullanıcı girişi bulunamadı.");
            }

            _logger.LogInformation("Arkadaşlık silme işlemi: {UserId} -> {FriendId}", callerId, request.FriendId);

            if (string.Equals(callerId, AiUserId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(request.FriendId, AiUserId, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("AI arkadaş silme denemesi engellendi: {UserId} -> {FriendId}", callerId, request.FriendId);
                throw new BusinessException("AI_FRIEND_CANNOT_BE_REMOVED",
                    "Yapay zeka arkadaşı silinemez",
                    "Yapay zeka sohbeti silinemez.");
            }

            var friendship = await _friendReadRepository.GetFriendRequestAsync(callerId, request.FriendId);

            if (friendship == null)
            {
                throw new NotFoundException("Friendship", $"{callerId}-{request.FriendId}");
            }

            if (string.Equals(friendship.SenderId, AiUserId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(friendship.ReceiverId, AiUserId, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("AI arkadaş kaydı silinmeye çalışıldı ve engellendi: {FriendshipId}", friendship.Id);
                throw new BusinessException("AI_FRIEND_CANNOT_BE_REMOVED",
                    "Yapay zeka arkadaşı silinemez",
                    "Yapay zeka sohbeti silinemez.");
            }

            _friendWriteRepository.Remove(friendship);
            await _friendWriteRepository.SaveAsync();

            _logger.LogInformation("Arkadaşlık başarıyla silindi: {FriendshipId}", friendship.Id);

            return new RemoveFriendCommandResponse
            {
                IsSuccess = true,
                Message = "Arkadaşlık başarıyla silindi."
            };
        }
    }
}