using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using ChatApplication.Application.Interfaces.Message;
using System.Threading;
using ChatApplication.Domain.Entities;

namespace ChatApplication.Application.Features.Messages.Queries.GetMessages
{
    public class GetMessagesQueryHandler : IRequestHandler<GetMessagesQuery, List<GetMessagesQueryResponse>>
    {
        private readonly IMessageReadRepository _messageReadRepository;

        public GetMessagesQueryHandler(IMessageReadRepository messageReadRepository)
        {
            _messageReadRepository = messageReadRepository;
        }

        public async Task<List<GetMessagesQueryResponse>> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
        {
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
