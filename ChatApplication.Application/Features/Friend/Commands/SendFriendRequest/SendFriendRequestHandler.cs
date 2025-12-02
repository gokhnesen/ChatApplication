using ChatApplication.Application.Exceptions;
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
            _logger.LogInformation("Friend isteği işleniyor: {SenderId}", request.SenderId);

            var sender = await _userManager.FindByIdAsync(request.SenderId);
            if (sender == null)
            {
                throw new NotFoundException("User", request.SenderId);
            }

            ApplicationUser receiver;
            if (!string.IsNullOrEmpty(request.FriendCode))
            {
                receiver = await _userManager.Users.FirstOrDefaultAsync(u => u.FriendCode == request.FriendCode, cancellationToken);
                if (receiver == null)
                {
                    throw new NotFoundException("User", $"FriendCode:{request.FriendCode}");
                }

                request.ReceiverId = receiver.Id;
            }
            else
            {
                if (string.IsNullOrEmpty(request.ReceiverId))
                {
                    throw new ValidationException(nameof(request.ReceiverId), "ReceiverId veya FriendCode sağlanmalıdır.");
                }

                receiver = await _userManager.FindByIdAsync(request.ReceiverId);
                if (receiver == null)
                {
                    throw new NotFoundException("User", request.ReceiverId);
                }
            }

            if (sender.Id == receiver.Id)
            {
                throw new BusinessException("SELF_REQUEST", "Kendinize arkadaşlık isteği gönderemezsiniz.", "Kendinize arkadaşlık isteği gönderemezsiniz.");
            }

            var existingFriendship = await _friendReadRepository.GetFriendRequestAsync(request.SenderId, receiver.Id);
            if (existingFriendship != null)
            {
                throw new BusinessException("FRIENDSHIP_EXISTS", "Arkadaşlık isteği zaten gönderilmiş veya zaten arkadaşsınız.", "Arkadaşlık isteği zaten gönderilmiş.");
            }

            var isBlocked = await _friendReadRepository.IsBlockedAsync(receiver.Id, request.SenderId);
            if (isBlocked)
            {
                throw new BusinessException("USER_BLOCKED", "Alıcı sizi engellemiş; işlem gerçekleştirilemedi.", "Bu kullanıcıya arkadaşlık isteği gönderemezsiniz.");
            }

            var hasBlockedYou = await _friendReadRepository.IsBlockedAsync(request.SenderId, receiver.Id);
            if (hasBlockedYou)
            {
                throw new BusinessException("YOU_BLOCKED_USER", "Bu kullanıcıyı siz engellemişsiniz; işlem gerçekleştirilemedi.", "Bu kullanıcıya arkadaşlık isteği gönderemezsiniz.");
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
                .SendAsync("FriendRequestReceived", requestInfo, cancellationToken);

            return new SendFriendRequestResponse
            {
                IsSuccess = true,
                Message = "Arkadaşlık isteği başarıyla gönderildi.",
                FriendshipId = friendship.Id
            };
        }
    }
}