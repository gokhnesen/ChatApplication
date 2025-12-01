using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Features.Friend.Commands.BlockFriend;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.UnBlockFriend
{
    public class UnBlockFriendOrUserCommandHandler : IRequestHandler<UnBlockFriendOrUserCommand, UnBlockFriendOrUserCommandResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<UnBlockFriendOrUserCommandHandler> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UnBlockFriendOrUserCommandHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<UnBlockFriendOrUserCommandHandler> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<UnBlockFriendOrUserCommandResponse> Handle(UnBlockFriendOrUserCommand request, CancellationToken cancellationToken)
        {
            var callerId = request.BlockerId;
            if (string.IsNullOrWhiteSpace(callerId))
            {
                callerId = _httpContextAccessor?.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            }

            if (string.IsNullOrWhiteSpace(callerId))
            {
                _logger.LogWarning("Unauthorized unblock attempt (no user id in context)");
                throw new UnauthorizedException("Kullanıcı girişi bulunamadı.");
            }

            _logger.LogInformation("Kullanıcı engel kaldırma işlemi: {BlockerId} -> {BlockedUserId}", callerId, request.BlockedUserId);

            var friendship = await _friendReadRepository.GetFriendRequestAsync(callerId, request.BlockedUserId);

            if (friendship == null)
            {
                _logger.LogWarning("Engelleme kaydı bulunamadı: {BlockerId} -> {BlockedUserId}", callerId, request.BlockedUserId);
                throw new NotFoundException("Block record", $"{callerId}-{request.BlockedUserId}");
            }

            if (friendship.Status != FriendStatus.Engellendi)
            {
                _logger.LogWarning("Kullanıcı engellenmemiş: {FriendshipId}", friendship.Id);
                throw new BusinessException("NOT_BLOCKED", "Kullanıcı engellenmemiş.", "Kullanıcı engellenmemiş.");
            }

            if (friendship.SenderId != callerId)
            {
                _logger.LogWarning("Yetkisiz engel kaldırma denemesi: {CallerId} for {FriendshipId}", callerId, friendship.Id);
                throw new UnauthorizedException("Bu engellemeyi kaldıramazsınız.");
            }

            _friendWriteRepository.Remove(friendship);
            await _friendWriteRepository.SaveAsync();

            return new UnBlockFriendOrUserCommandResponse
            {
                IsSuccess = true,
                Message = "Engel başarıyla kaldırıldı."
            };
        }
    }
}
