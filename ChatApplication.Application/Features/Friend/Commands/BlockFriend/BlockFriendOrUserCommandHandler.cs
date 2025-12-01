using ChatApplication.Application.Exceptions;
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

namespace ChatApplication.Application.Features.Friend.Commands.BlockFriend
{
    public class BlockFriendOrUserCommandHandler : IRequestHandler<BlockFriendOrUserCommand, BlockFriendOrUserCommandResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<BlockFriendOrUserCommandHandler> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string AiUserId = "ai-bot";

        public BlockFriendOrUserCommandHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<BlockFriendOrUserCommandHandler> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BlockFriendOrUserCommandResponse> Handle(BlockFriendOrUserCommand request, CancellationToken cancellationToken)
        {
            var callerId = request.BlockerId;
            if (string.IsNullOrWhiteSpace(callerId))
            {
                callerId = _httpContextAccessor?.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            }

            if (string.IsNullOrWhiteSpace(callerId))
            {
                _logger.LogWarning("Unauthorized block attempt (no user id in context)");
                throw new UnauthorizedException("Kullanıcı girişi bulunamadı.");
            }

            _logger.LogInformation("Kullanıcı engelleme işlemi: {BlockerId} -> {BlockedUserId}", callerId, request.BlockedUserId);

            if (string.Equals(request.BlockedUserId, AiUserId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(callerId, AiUserId, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("AI engelleme denemesi engellendi: {BlockerId} -> {BlockedUserId}", callerId, request.BlockedUserId);
                throw new BusinessException("AI_CANNOT_BE_BLOCKED", "Yapay zeka engellenemez", "Yapay zeka engellenemez.");
            }

            var friendship = await _friendReadRepository.GetFriendRequestAsync(callerId, request.BlockedUserId);

            if (friendship != null)
            {
                if (friendship.SenderId == callerId)
                {
                    friendship.Status = FriendStatus.Engellendi;
                    await _friendWriteRepository.UpdateAsync(friendship);
                }
                else
                {
                    _friendWriteRepository.Remove(friendship);
                    await _friendWriteRepository.SaveAsync();

                    var blockRecord = new Domain.Entities.Friend
                    {
                        SenderId = callerId,
                        ReceiverId = request.BlockedUserId,
                        Status = FriendStatus.Engellendi,
                        RequestDate = DateTime.UtcNow
                    };
                    await _friendWriteRepository.AddAsync(blockRecord);
                }
            }
            else
            {
                var blockRecord = new Domain.Entities.Friend
                {
                    SenderId = callerId,
                    ReceiverId = request.BlockedUserId,
                    Status = FriendStatus.Engellendi,
                    RequestDate = DateTime.UtcNow
                };
                await _friendWriteRepository.AddAsync(blockRecord);
            }

            await _friendWriteRepository.SaveAsync();

            return new BlockFriendOrUserCommandResponse
            {
                IsSuccess = true,
                Message = "Kullanıcı başarıyla engellendi."
            };
        }
    }
}
