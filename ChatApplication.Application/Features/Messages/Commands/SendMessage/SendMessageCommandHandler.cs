using ChatApplication.Application.Interfaces;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading;
using System.Threading.Tasks;

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
            // --- 1. İŞ MANTIĞI VE KONTROL ---

            if (string.IsNullOrEmpty(request.ReceiverId))
            {
                throw new HubException("Alıcı belirtilmemiş."); // Hub'ın yakalayacağı bir Exception fırlatın
            }

            // Arkadaşlık Kontrolü (Veritabanı Sorgusu)
            var friendship = await _friendReadRepository.GetFriendRequestAsync(request.SenderId, request.ReceiverId);
            if (friendship == null || friendship.Status != FriendStatus.Onaylandi)
            {
                throw new HubException("Mesaj gönderebilmek için alıcı ile arkadaş olmanız gerekir.");
            }

            // Engelleme Kontrolü (Veritabanı Sorgusu)
            var receiverBlockedSender = await _friendReadRepository.IsBlockedAsync(request.ReceiverId, request.SenderId);
            if (receiverBlockedSender)
            {
                throw new HubException("Alıcı sizi engellemiş, mesaj gönderilemedi.");
            }
            // Göndericinin alıcıyı engelleme kontrolü de aynı şekilde yapılabilir.


            // --- 2. VERİTABANI İŞLEMİ (Kalıcılık) ---

            var message = new Message
            {
                SenderId = request.SenderId,
                ReceiverId = request.ReceiverId,
                Content = request.Content,
                SentAt = DateTime.UtcNow, // Sunucu zamanı önemlidir
                IsRead = false,
                Type = request.Type,
                AttachmentUrl = request.AttachmentUrl,
                AttachmentName = request.AttachmentName,
                AttachmentSize = request.AttachmentSize
            };

            await _writeRepository.AddAsync(message);
            await _writeRepository.SaveAsync();

            // --- 3. GERÇEK ZAMANLI İLETİM ---

            // HubContext kullanarak alıcıya mesajı ilet.
            // Bu, Hub dışından (Handler içinden) SignalR istemcilerine erişmenin Best Practice yoludur.
            await _hubContext.Clients.User(request.ReceiverId).SendAsync("ReceiveMessage",
                message.SenderId,
                message.Content,
                message.Type,
                message.AttachmentUrl,
                message.AttachmentName,
                message.AttachmentSize,
                message.Id, // Mesaj ID'si alıcıya da gönderilir
                message.SentAt);

            // --- 4. YANIT DÖNÜŞÜ ---

            return new SendMessageCommandResponse // Kaydedilen verileri Hub'a geri gönderiyoruz
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