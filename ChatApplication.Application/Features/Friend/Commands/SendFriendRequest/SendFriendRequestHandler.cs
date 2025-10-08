using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.SendFriendRequest
{
    public class SendFriendRequestHandler : IRequestHandler<SendFriendRequestCommand, SendFriendRequestResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<SendFriendRequestHandler> _logger;

        public SendFriendRequestHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            UserManager<ApplicationUser> userManager,
            ILogger<SendFriendRequestHandler> logger)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<SendFriendRequestResponse> Handle(SendFriendRequestCommand request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Friend isteği işleniyor: {SenderId} -> {ReceiverId}", 
                    request.SenderId, request.ReceiverId);

                var sender = await _userManager.FindByIdAsync(request.SenderId);
                if (sender == null)
                {
                    return new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Gönderen kullanıcı bulunamadı.",
                        Errors = new List<string> { "Sender not found" }
                    };
                }

                var receiver = await _userManager.FindByIdAsync(request.ReceiverId);
                if (receiver == null)
                {
                    return new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Alıcı kullanıcı bulunamadı.",
                        Errors = new List<string> { "Receiver not found" }
                    };
                }

                var existingFriendship = await _friendReadRepository.GetFriendRequestAsync(request.SenderId, request.ReceiverId);
                if (existingFriendship != null)
                {
                    return new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Arkadaşlık isteği zaten gönderilmiş veya arkadaşsınız.",
                        Errors = new List<string> { "Friendship already exists" }
                    };
                }

                var friendship = new Domain.Entities.Friend
                {
                    SenderId = request.SenderId,
                    ReceiverId = request.ReceiverId,
                    Status = FriendStatus.Beklemede,
                    RequestDate = DateTime.UtcNow
                };

                await _friendWriteRepository.AddAsync(friendship);
                await _friendWriteRepository.SaveAsync();

                return new SendFriendRequestResponse
                {
                    IsSuccess = true,
                    Message = "Arkadaşlık isteği başarıyla gönderildi.",
                    FriendshipId = friendship.Id
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Arkadaşlık isteği gönderilirken hata oluştu");
                return new SendFriendRequestResponse
                {
                    IsSuccess = false,
                    Message = "İşlem sırasında bir hata oluştu.",
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}