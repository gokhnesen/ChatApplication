using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using ChatApplication.Application.Interfaces.Message;
using System.Threading;
using ChatApplication.Domain.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ChatApplication.Application.Exceptions;

namespace ChatApplication.Application.Features.Messages.Queries.GetMessages
{
    public class GetMessagesQueryHandler : IRequestHandler<GetMessagesQuery, List<GetMessagesQueryResponse>>
    {
        private readonly IMessageReadRepository _messageReadRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GetMessagesQueryHandler(IMessageReadRepository messageReadRepository, IHttpContextAccessor httpContextAccessor)
        {
            _messageReadRepository = messageReadRepository;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<List<GetMessagesQueryResponse>> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
        {
            var currentUserId = request.UserId1; 
                                                 
            var resolvedUserId = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                                ?? currentUserId;

            if (string.IsNullOrEmpty(resolvedUserId))
            {
                throw new UnauthorizedException();
            }

            if (resolvedUserId != request.UserId1 && resolvedUserId != request.UserId2)
            {
                throw new UnauthorizedException();
            }

            var messages = await _messageReadRepository.GetMessagesAsync(request.UserId1, request.UserId2);

            var response = new List<GetMessagesQueryResponse>();
            foreach (var message in messages)
            {
                response.Add(new GetMessagesQueryResponse
                {
                    Id = message.Id,
                    SenderId = message.SenderId,
                    ReceiverId = message.ReceiverId,
                    Content = message.Content,
                    SentAt = message.SentAt,
                    IsRead = message.IsRead,
                    Type = message.Type,
                    AttachmentUrl = message.AttachmentUrl,
                    AttachmentName = message.AttachmentName,
                    AttachmentSize = message.AttachmentSize
                });
            }

            return response;
        }
    }
}
