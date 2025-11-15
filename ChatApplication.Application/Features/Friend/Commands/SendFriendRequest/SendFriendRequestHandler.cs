using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
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
        private readonly IHubContext<ChatHub> _hubContext;

        public SendFriendRequestHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            UserManager<ApplicationUser> userManager,
            ILogger<SendFriendRequestHandler> logger,
            IHubContext<ChatHub> hubContext)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _userManager = userManager;
            _logger = logger;
            _hubContext = hubContext;
        }

        public async Task<SendFriendRequestResponse> Handle(SendFriendRequestCommand request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Friend isteği işleniyor: {SenderId}", request.SenderId);

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

                ApplicationUser receiver;
                if (!string.IsNullOrEmpty(request.FriendCode))
                {
                    receiver = await _userManager.Users.FirstOrDefaultAsync(u => u.FriendCode == request.FriendCode);
                    if (receiver == null)
                    {
                        return new SendFriendRequestResponse
                        {
                            IsSuccess = false,
                            Message = "Bu arkadaşlık koduna sahip kullanıcı bulunamadı.",
                            Errors = new List<string> { "User with this friend code not found" }
                        };
                    }
                    // Receiver ID'yi friend code ile bulunan kullanıcının ID'si ile güncelle
                    request.ReceiverId = receiver.Id;
                }
                else
                {
                    // Eğer friend code yoksa, receiver ID ile kullanıcıyı bul
                    receiver = await _userManager.FindByIdAsync(request.ReceiverId);
                    if (receiver == null)
                    {
                        return new SendFriendRequestResponse
                        {
                            IsSuccess = false,
                            Message = "Alıcı kullanıcı bulunamadı.",
                            Errors = new List<string> { "Receiver not found" }
                        };
                    }
                }

                // Kendine arkadaşlık isteği göndermeyi engelle
                if (sender.Id == receiver.Id)
                {
                    return new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Kendinize arkadaşlık isteği gönderemezsiniz.",
                        Errors = new List<string> { "Cannot send friend request to yourself" }
                    };
                }

                var existingFriendship = await _friendReadRepository.GetFriendRequestAsync(request.SenderId, receiver.Id);
                if (existingFriendship != null)
                {
                    return new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Arkadaşlık isteği zaten gönderilmiş veya arkadaşsınız.",
                        Errors = new List<string> { "Friendship already exists" }
                    };
                }

                // Engelleme kontrolü
                var isBlocked = await _friendReadRepository.IsBlockedAsync(receiver.Id, request.SenderId);
                if (isBlocked)
                {
                    return new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Bu kullanıcıya arkadaşlık isteği gönderemezsiniz.",
                        Errors = new List<string> { "User is blocked" }
                    };
                }

                var hasBlockedYou = await _friendReadRepository.IsBlockedAsync(request.SenderId, receiver.Id);
                if (hasBlockedYou)
                {
                    return new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Bu kullanıcıya arkadaşlık isteği gönderemezsiniz.",
                        Errors = new List<string> { "You have blocked this user" }
                    };
                }

                var friendship = new Domain.Entities.Friend
                {
                    SenderId = request.SenderId,
                    ReceiverId = receiver.Id,
                    Status = FriendStatus.Beklemede,
                    RequestDate = DateTime.UtcNow
                };

                await _friendWriteRepository.AddAsync(friendship);
                await _friendWriteRepository.SaveAsync();

                // SignalR ile canlı bildirim gönder
                var requestInfo = new
                {
                    friendshipId = friendship.Id,
                    senderId = sender.Id,
                    senderName = sender.Name,
                    senderLastName = sender.LastName,
                    senderEmail = sender.Email,
                    requestDate = friendship.RequestDate,
                    senderProfilePhotoUrl = sender.ProfilePhotoUrl
                };

                await _hubContext.Clients.User(receiver.Id)
                    .SendAsync("FriendRequestReceived", requestInfo);

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