using ChatApplication.Application.Features.Messages.Commands.SendMessage;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using static System.Net.Mime.MediaTypeNames;

namespace ChatApplication.Application.SignalR
{
    public class ChatHub : Hub
    {
        private readonly ILogger<ChatHub> _logger;

        // connectionId -> userId
        private static readonly ConcurrentDictionary<string, string> _connectionUserMap = new();

        // userId -> connection count
        private static readonly ConcurrentDictionary<string, int> _userConnectionCount = new();
        private readonly IMediator _mediator;
        // Change this:
    
        public ChatHub(ILogger<ChatHub> logger, IMediator mediator)
        {
            _logger = logger;
            _mediator = mediator;
        }

        public async Task SendMessage(
                    string receiverId,
                    string content,
                    int type = 0,
                    string? attachmentUrl = null,
                    string? attachmentName = null,
                    long? attachmentSize = null)
        {
            var senderId = Context.UserIdentifier;

            if (string.IsNullOrEmpty(senderId))
            {
                _logger.LogWarning("SendMessage çağrıldı ama UserIdentifier null");
                throw new HubException("Kullanıcı kimliği bulunamadı");
            }

            // 1. Command'ı Oluştur
            var command = new SendMessageCommand
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Content = content,
                Type = (MessageType)type,
                AttachmentUrl = attachmentUrl,
                AttachmentName = attachmentName,
                AttachmentSize = attachmentSize
            };

            try
            {
                _logger.LogInformation("SignalR Command Handler'a mesaj gönderiyor: {SenderId} -> {ReceiverId}", senderId, receiverId);

                // 2. Command'ı Handler'a Gönder (Tüm İş Mantığı Handler'da çalışacak)
                var response = await _mediator.Send(command);

                // 3. Başarılı olduysa, SADECE göndericiyi bilgilendir (Alıcıya iletimi Handler yapacak)
                await Clients.Caller.SendAsync("MessageSent",
                    response.ReceiverId,
                    response.Content,
                    response.Type,
                    response.AttachmentUrl,
                    response.AttachmentName,
                    response.AttachmentSize,
                    response.MessageId, // Yeni eklenen: Mesaj ID'sini geri gönderiyoruz
                    response.SentAt);  // Yeni eklenen: Sunucu zamanını geri gönderiyoruz
            }
            catch (HubException ex)
            {
                // İş mantığı hatalarını (örneğin engellenme) istemciye ilet
                _logger.LogWarning("Hub hatası: {Message}", ex.Message);
                await Clients.Caller.SendAsync("MessageError", ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SignalR mesaj iletiminde beklenmeyen hata oluştu");
                await Clients.Caller.SendAsync("MessageError", "Bir hata oluştu");
            }
        }

        public async Task NotifyTyping(string receiverId)
        {
            var senderId = Context.UserIdentifier;
            await Clients.User(receiverId).SendAsync("UserIsTyping", senderId);
        }

        public async Task NotifyStoppedTyping(string receiverId)
        {
            var senderId = Context.UserIdentifier;
            await Clients.User(receiverId).SendAsync("UserStoppedTyping", senderId);
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                _connectionUserMap[connectionId] = userId;

                _userConnectionCount.AddOrUpdate(userId, 1, (_, existing) => existing + 1);

                _logger.LogInformation("Kullanıcı bağlandı: {UserId}, ConnectionId: {ConnectionId}, Connections: {Count}",
                    userId, connectionId, _userConnectionCount[userId]);
            }
            else
            {
                _logger.LogInformation("Anonim bağlantı: ConnectionId {ConnectionId}", connectionId);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var connectionId = Context.ConnectionId;

            if (_connectionUserMap.TryRemove(connectionId, out var userId) && !string.IsNullOrEmpty(userId))
            {
                // decrement count
                _userConnectionCount.AddOrUpdate(userId, 0, (_, existing) =>
                {
                    var newVal = Math.Max(0, existing - 1);
                    return newVal;
                });

                // if zero, remove key
                if (_userConnectionCount.TryGetValue(userId, out var cnt) && cnt == 0)
                {
                    _userConnectionCount.TryRemove(userId, out _);
                }

                _logger.LogInformation("Kullanıcı bağlantısı kesildi: {UserId}, ConnectionId: {ConnectionId}, RemainingConnections: {Count}",
                    userId, connectionId, _userConnectionCount.TryGetValue(userId, out var remaining) ? remaining : 0);
            }
            else
            {
                _logger.LogInformation("Bilinmeyen bağlantı kesildi: ConnectionId {ConnectionId}", connectionId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public Task<bool> IsUserOnline(string userId)
        {
            var online = IsUserConnected(userId);
            return Task.FromResult(online);
        }


        public static bool IsUserConnected(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return false;
            return _userConnectionCount.TryGetValue(userId, out var count) && count > 0;
        }


        public async Task NotifyMessagesRead(List<string> messageIds)
        {
            try
            {
                var senderId = Context.UserIdentifier;

                if (string.IsNullOrEmpty(senderId))
                {
                    _logger.LogWarning("NotifyMessagesRead çağrıldı ama UserIdentifier null");
                    return;
                }

                _logger.LogInformation("{Count} mesaj okundu olarak işaretlendi: {SenderId}",
                    messageIds.Count, senderId);

                // QUICK FIX: tüm istemcilere bildir (hemen çalışır)
                await Clients.All.SendAsync("MessagesRead", messageIds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "NotifyMessagesRead'de hata oluştu");
            }
        }

    }
}