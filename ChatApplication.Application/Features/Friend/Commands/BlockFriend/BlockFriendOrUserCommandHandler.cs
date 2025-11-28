using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.BlockFriend
{
    public class BlockFriendOrUserCommandHandler : IRequestHandler<BlockFriendOrUserCommand, BlockFriendOrUserCommandResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<BlockFriendOrUserCommandHandler> _logger;
        private const string AiUserId = "ai-bot";

        public BlockFriendOrUserCommandHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<BlockFriendOrUserCommandHandler> logger)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
        }

        public async Task<BlockFriendOrUserCommandResponse> Handle(BlockFriendOrUserCommand request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Kullanıcı engelleme işlemi: {BlockerId} -> {BlockedUserId}", request.BlockerId, request.BlockedUserId);

                if (string.Equals(request.BlockedUserId, AiUserId, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(request.BlockerId, AiUserId, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("AI engelleme denemesi engellendi: {BlockerId} -> {BlockedUserId}", request.BlockerId, request.BlockedUserId);
                    return new BlockFriendOrUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Yapay zeka engellenemez."
                    };
                }

                // Mevcut arkadaşlık kaydını kontrol et
                var friendship = await _friendReadRepository.GetFriendRequestAsync(request.BlockerId, request.BlockedUserId);

                if (friendship != null)
                {
                    // Eğer kayıt varsa ve engelleyen kişi sender ise, durumu güncelle
                    // Yoksa kaydı sil ve yeni engelleme kaydı oluştur
                    if (friendship.SenderId == request.BlockerId)
                    {
                        friendship.Status = FriendStatus.Engellendi;
                        await _friendWriteRepository.UpdateAsync(friendship);
                    }
                    else
                    {
                        // Karşı tarafın gönderdiği istek varsa, önce sil
                        _friendWriteRepository.Remove(friendship);
                        await _friendWriteRepository.SaveAsync();

                        // Yeni engelleme kaydı oluştur
                        var blockRecord = new Domain.Entities.Friend
                        {
                            SenderId = request.BlockerId,
                            ReceiverId = request.BlockedUserId,
                            Status = FriendStatus.Engellendi,
                            RequestDate = DateTime.UtcNow
                        };
                        await _friendWriteRepository.AddAsync(blockRecord);
                    }
                }
                else
                {
                    // Hiç kayıt yoksa yeni engelleme kaydı oluştur
                    var blockRecord = new Domain.Entities.Friend
                    {
                        SenderId = request.BlockerId,
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kullanıcı engellenirken hata oluştu");
                return new BlockFriendOrUserCommandResponse
                {
                    IsSuccess = false,
                    Message = "İşlem sırasında bir hata oluştu.",
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
