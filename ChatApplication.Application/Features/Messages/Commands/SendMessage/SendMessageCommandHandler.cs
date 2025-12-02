using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Messages.Commands.SendMessage
{
  

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, SendMessageCommandResponse>
    {
        private readonly IWriteRepository<Message> _writeRepository;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SendMessageCommandHandler(
            IWriteRepository<Message> writeRepository,
            IHubContext<ChatHub> hubContext,
            IFriendReadRepository friendReadRepository,
            IHttpContextAccessor httpContextAccessor)
        {
            _writeRepository = writeRepository;
            _hubContext = hubContext;
            _friendReadRepository = friendReadRepository;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<SendMessageCommandResponse> Handle(SendMessageCommand request, CancellationToken cancellationToken)
        {
            // Ensure SenderId is present: prefer request value, otherwise read from HttpContext
            var senderId = request.SenderId;
            if (string.IsNullOrEmpty(senderId))
            {
                senderId = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(senderId))
                {
                    throw new UnauthorizedException();
                }

                request.SenderId = senderId;
            }

            // Validate receiver
            if (string.IsNullOrEmpty(request.ReceiverId))
            {
                throw new ValidationException(nameof(request.ReceiverId), "Alıcı belirtilmemiş.");
            }

            // Arkadaşlık Kontrolü
            var friendship = await _friendReadRepository.GetFriendRequestAsync(request.SenderId, request.ReceiverId);
            if (friendship == null || friendship.Status != FriendStatus.Onaylandi)
            {
                throw new BusinessException("FRIEND_REQUIRED", "Mesaj gönderebilmek için alıcı ile arkadaş olmanız gerekir.", "Mesaj gönderme yetkiniz yok.");
            }

            // Engelleme Kontrolü
            var receiverBlockedSender = await _friendReadRepository.IsBlockedAsync(request.ReceiverId, request.SenderId);
            if (receiverBlockedSender)
            {
                throw new BusinessException("USER_BLOCKED", "Alıcı sizi engellemiş, mesaj gönderilemedi.", "Mesaj gönderilemedi.");
            }

            // Create and persist message
            var message = new Message
            {
                SenderId = request.SenderId,
                ReceiverId = request.ReceiverId,
                Content = request.Content,
                SentAt = DateTime.UtcNow,
                IsRead = false,
                Type = request.Type,
                AttachmentUrl = request.AttachmentUrl,
                AttachmentName = request.AttachmentName,
                AttachmentSize = request.AttachmentSize
            };

            await _writeRepository.AddAsync(message);
            await _writeRepository.SaveAsync();

            await _hubContext.Clients.User(request.ReceiverId).SendAsync("ReceiveMessage",
                message.SenderId,
                message.Content,
                message.Type,
                message.AttachmentUrl,
                message.AttachmentName,
                message.AttachmentSize,
                message.Id,
                message.SentAt, cancellationToken);

            return new SendMessageCommandResponse
            {
                MessageId = message.Id,
                SenderId = message.SenderId,
                ReceiverId = message.ReceiverId,
                Content = message.Content,
                SentAt = message.SentAt,
                Type = message.Type,
                AttachmentUrl = message.AttachmentUrl,
                AttachmentName = message.AttachmentName,
                AttachmentSize = message.AttachmentSize
            };
        }
    }
}