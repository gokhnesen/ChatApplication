using ChatApplication.Application.Features.Friend.Commands.BlockFriend;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.UnBlockFriend
{
    public class UnBlockFriendOrUserCommandHandler : IRequestHandler<UnBlockFriendOrUserCommand, UnBlockFriendOrUserCommandResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<UnBlockFriendOrUserCommandHandler> _logger;

        public UnBlockFriendOrUserCommandHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<UnBlockFriendOrUserCommandHandler> logger)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
        }

        public async Task<UnBlockFriendOrUserCommandResponse> Handle(UnBlockFriendOrUserCommand request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Kullanıcı engel kaldırma işlemi: {BlockerId} -> {BlockedUserId}", request.BlockerId, request.BlockedUserId);

                var friendship = await _friendReadRepository.GetFriendRequestAsync(request.BlockerId, request.BlockedUserId);

                if (friendship == null)
                {
                    return new UnBlockFriendOrUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Engelleme kaydı bulunamadı."
                    };
                }

                if (friendship.Status != FriendStatus.Engellendi)
                {
                    return new UnBlockFriendOrUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Kullanıcı engellenmemiş."
                    };
                }

                if (friendship.SenderId != request.BlockerId)
                {
                    return new UnBlockFriendOrUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Bu engellemeyi kaldıramazsınız."
                    };
                }

                _friendWriteRepository.Remove(friendship);
                await _friendWriteRepository.SaveAsync();

                return new UnBlockFriendOrUserCommandResponse
                {
                    IsSuccess = true,
                    Message = "Engel başarıyla kaldırıldı."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Engel kaldırılırken hata oluştu");
                return new UnBlockFriendOrUserCommandResponse
                {
                    IsSuccess = false,
                    Message = "İşlem sırasında bir hata oluştu.",
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
