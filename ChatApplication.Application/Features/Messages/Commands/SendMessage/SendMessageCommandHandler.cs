using MediatR;
using ChatApplication.Application.SignalR;
using ChatApplication.Application.Interfaces;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using System.Threading;
using System.Threading.Tasks;
using ChatApplication.Application.Interfaces.Friend;

namespace ChatApplication.Application.Features.Messages.Commands.SendMessage
{
    public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, SendMessageCommandResponse>
    {
        private readonly IWriteRepository<Message> _writeRepository;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IFriendReadRepository _friendReadRepository;

        public SendMessageCommandHandler(
            IWriteRepository<Message> writeRepository,
            IHubContext<ChatHub> hubContext,
            IFriendReadRepository friendReadRepository)
        {
            _writeRepository = writeRepository;
            _hubContext = hubContext;
            _friendReadRepository = friendReadRepository;
        }

        public async Task<SendMessageCommandResponse> Handle(SendMessageCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(request.ReceiverId))
            {
                throw new InvalidOperationException("Alıcı belirtilmemiş.");
            }

            var friendship = await _friendReadRepository.GetFriendRequestAsync(request.SenderId, request.ReceiverId);
            if (friendship == null || friendship.Status != FriendStatus.Onaylandi)
            {
                throw new InvalidOperationException("Mesaj gönderebilmek için alıcı ile arkadaş olmanız gerekir.");
            }

            var receiverBlockedSender = await _friendReadRepository.IsBlockedAsync(request.ReceiverId, request.SenderId);
            if (receiverBlockedSender)
            {
                throw new InvalidOperationException("Alıcı sizi engellemiş, mesaj gönderemezsiniz.");
            }

            var senderBlockedReceiver = await _friendReadRepository.IsBlockedAsync(request.SenderId, request.ReceiverId);
            if (senderBlockedReceiver)
            {
                throw new InvalidOperationException("Bu kullanıcı engellenmiş, işlem yapılamaz.");
            }

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

            // SignalR ile alıcıya mesajı gönder
            await _hubContext.Clients.User(request.ReceiverId)
                .SendAsync("ReceiveMessage", new
                {
                    messageId = message.Id,
                    senderId = message.SenderId,
                    receiverId = message.ReceiverId,
                    content = message.Content,
                    sentAt = message.SentAt,
                    type = message.Type,
                    attachmentUrl = message.AttachmentUrl,
                    attachmentName = message.AttachmentName,
                    attachmentSize = message.AttachmentSize
                }, cancellationToken);

            await _hubContext.Clients.User(request.SenderId)
                .SendAsync("MessageSent", new
                {
                    messageId = message.Id,
                    senderId = message.SenderId,
                    receiverId = message.ReceiverId,
                    content = message.Content,
                    sentAt = message.SentAt,
                    type = message.Type,
                    attachmentUrl = message.AttachmentUrl,
                    attachmentName = message.AttachmentName,
                    attachmentSize = message.AttachmentSize
                }, cancellationToken);

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
