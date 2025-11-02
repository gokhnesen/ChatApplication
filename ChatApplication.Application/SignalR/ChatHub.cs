using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace ChatApplication.Application.SignalR
{
    public class ChatHub : Hub
    {
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(ILogger<ChatHub> logger)
        {
            _logger = logger;
        }

        public async Task SendMessage(string receiverId, string content)
        {
            try
            {
                // Context.UserIdentifier ile gönderen kullanıcının ID'sini al
                var senderId = Context.UserIdentifier;

                if (string.IsNullOrEmpty(senderId))
                {
                    _logger.LogWarning("SendMessage çağrıldı ama UserIdentifier null");
                    throw new HubException("Kullanıcı kimliği bulunamadı");
                }

                _logger.LogInformation("SignalR mesaj iletiliyor: {SenderId} -> {ReceiverId}", senderId, receiverId);

                // Alıcıya mesajı gönder
                await Clients.User(receiverId).SendAsync("ReceiveMessage", senderId, content);

                // Göndericiye de geri bildir (birden fazla cihaz veya sekme için)
                await Clients.Caller.SendAsync("MessageSent", receiverId, content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SignalR mesaj iletiminde hata oluştu");
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
            _logger.LogInformation("Kullanıcı bağlandı: {UserId}, ConnectionId: {ConnectionId}", 
                userId, Context.ConnectionId);
            
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userId = Context.UserIdentifier;
            _logger.LogInformation("Kullanıcı bağlantısı kesildi: {UserId}, ConnectionId: {ConnectionId}", 
                userId, Context.ConnectionId);
            
            await base.OnDisconnectedAsync(exception);
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

                // Mesaj göndericisine bildir (MessageRead event)
                await Clients.User(senderId).SendAsync("MessageRead", messageIds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "NotifyMessagesRead'de hata oluştu");
            }
        }
    }
}
