using ChatApplication.Application.Interfaces.Message;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ChatApplication.Application.Features.Messages.Queries.GetLatestMessage
{
    public class GetLatestMessageQueryHandler : IRequestHandler<GetLatestMessageQuery, GetLatestMessageQueryResponse>
    {
        private readonly IMessageReadRepository _messageReadRepository;
        private readonly ILogger<GetLatestMessageQueryHandler> _logger;

        public GetLatestMessageQueryHandler(
            IMessageReadRepository messageReadRepository,
            ILogger<GetLatestMessageQueryHandler> logger)
        {
            _messageReadRepository = messageReadRepository;
            _logger = logger;
        }

        public async Task<GetLatestMessageQueryResponse> Handle(GetLatestMessageQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("En son mesaj getiriliyor: {UserId1} <-> {UserId2}", 
                    request.UserId1, request.UserId2);

                var latestMessage = await _messageReadRepository.GetLatestMessageAsync(request.UserId1, request.UserId2);

                if (latestMessage == null)
                {
                    return new GetLatestMessageQueryResponse { HasMessage = false };
                }

                return new GetLatestMessageQueryResponse
                {
                    Id = latestMessage.Id.ToString(),
                    SenderId = latestMessage.SenderId,
                    ReceiverId = latestMessage.ReceiverId,
                    Content = latestMessage.Content,
                    SentAt = latestMessage.SentAt,
                    IsRead = latestMessage.IsRead,
                    HasMessage = true,
                    Type = latestMessage.Type,
                    AttachmentUrl = latestMessage.AttachmentUrl,
                    AttachmentName = latestMessage.AttachmentName,
                    AttachmentSize = latestMessage.AttachmentSize
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "En son mesaj getirilirken hata oluştu");
                return new GetLatestMessageQueryResponse { HasMessage = false };
            }
        }
    }
}