using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Application.SignalR;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

public class MarkMessagesAsReadCommandHandler : IRequestHandler<MarkMessagesAsReadCommand, MarkMessagesAsReadCommandResponse>
{
    private readonly IMessageWriteRepository _messageWriteRepository;
    private readonly IMessageReadRepository _messageReadRepository;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<MarkMessagesAsReadCommandHandler> _logger;

    public MarkMessagesAsReadCommandHandler(
        IMessageWriteRepository messageWriteRepository,
        IMessageReadRepository messageReadRepository,
        IHubContext<ChatHub> hubContext,
        ILogger<MarkMessagesAsReadCommandHandler> logger)
    {
        _messageWriteRepository = messageWriteRepository;
        _messageReadRepository = messageReadRepository;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<MarkMessagesAsReadCommandResponse> Handle(MarkMessagesAsReadCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var unreadMessages = await _messageReadRepository.GetUnreadMessagesAsync(request.UserId);
            var messagesToUpdate = unreadMessages.Where(m => m.SenderId == request.SenderId).ToList();

            foreach (var message in messagesToUpdate)
            {
                message.IsRead = true;
                await _messageWriteRepository.UpdateAsync(message);
            }
            await _messageWriteRepository.SaveAsync();

            var remainingUnreadCount = await _messageReadRepository.GetUnreadMessageCountAsync(request.UserId);

            await _hubContext.Clients.User(request.UserId)
                .SendAsync("UpdateUnreadMessageCount", remainingUnreadCount);

            return new MarkMessagesAsReadCommandResponse
            {
                IsSuccess = true,
                Message = "Mesajlar okundu olarak i?aretlendi.",
                UnreadCount = remainingUnreadCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Mesajlar? okundu olarak i?aretlerken hata olu?tu");
            return new MarkMessagesAsReadCommandResponse
            {
                IsSuccess = false,
                Message = "??lem s?ras?nda bir hata olu?tu.",
                Errors = new List<string> { ex.Message }
            };
        }
    }
}