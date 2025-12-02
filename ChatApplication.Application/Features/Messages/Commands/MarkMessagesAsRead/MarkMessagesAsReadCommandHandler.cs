using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Application.SignalR;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

public class MarkMessagesAsReadCommandHandler : IRequestHandler<MarkMessagesAsReadCommand, MarkMessagesAsReadCommandResponse>
{
    private readonly IMessageWriteRepository _messageWriteRepository;
    private readonly IMessageReadRepository _messageReadRepository;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<MarkMessagesAsReadCommandHandler> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public MarkMessagesAsReadCommandHandler(
        IMessageWriteRepository messageWriteRepository,
        IMessageReadRepository messageReadRepository,
        IHubContext<ChatHub> hubContext,
        ILogger<MarkMessagesAsReadCommandHandler> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _messageWriteRepository = messageWriteRepository;
        _messageReadRepository = messageReadRepository;
        _hubContext = hubContext;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<MarkMessagesAsReadCommandResponse> Handle(MarkMessagesAsReadCommand request, CancellationToken cancellationToken)
    {
        var userId = request.UserId;
        if (string.IsNullOrEmpty(userId))
        {
            userId = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedException();
            }
            request.UserId = userId;
        }

        if (string.IsNullOrEmpty(request.SenderId))
        {
            throw new ChatApplication.Application.Exceptions.ValidationException(nameof(request.SenderId), "SenderId is required.");
        }

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
            .SendAsync("UpdateUnreadMessageCount", remainingUnreadCount, cancellationToken);

        return new MarkMessagesAsReadCommandResponse
        {
            IsSuccess = true,
            Message = "Mesajlar okundu olarak i?aretlendi.",
            UnreadCount = remainingUnreadCount
        };
    }
}