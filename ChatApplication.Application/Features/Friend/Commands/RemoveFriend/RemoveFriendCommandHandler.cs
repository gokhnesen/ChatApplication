using ChatApplication.Application.Interfaces.Friend;
using MediatR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.RemoveFriend
{
    public class RemoveFriendCommandHandler : IRequestHandler<RemoveFriendCommand, RemoveFriendCommandResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<RemoveFriendCommandHandler> _logger;

        public RemoveFriendCommandHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<RemoveFriendCommandHandler> logger)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
        }

        public async Task<RemoveFriendCommandResponse> Handle(RemoveFriendCommand request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Arkadaşlık silme işlemi: {UserId} -> {FriendId}", request.UserId, request.FriendId);

                var friendship = await _friendReadRepository.GetFriendRequestAsync(request.UserId, request.FriendId);

                if (friendship == null)
                {
                    return new RemoveFriendCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Arkadaşlık ilişkisi bulunamadı.",
                        Errors = new List<string> { "Friendship not found" }
                    };
                }

                // Arkadaşlık kaydını fiziksel olarak sil
                _friendWriteRepository.Remove(friendship);
                await _friendWriteRepository.SaveAsync();

                return new RemoveFriendCommandResponse
                {
                    IsSuccess = true,
                    Message = "Arkadaşlık başarıyla silindi."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Arkadaşlık silinirken hata oluştu");
                return new RemoveFriendCommandResponse
                {
                    IsSuccess = false,
                    Message = "İşlem sırasında bir hata oluştu.",
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
