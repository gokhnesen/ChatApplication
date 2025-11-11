using MediatR;
using ChatApplication.Application.SignalR;
using ChatApplication.Application.Interfaces;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Messages.Commands.SendMessage
{
    public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, SendMessageCommandResponse>
    {
        private readonly IWriteRepository<Message> _writeRepository;
        private readonly IHubContext<ChatHub> _hubContext;

        public SendMessageCommandHandler(
            IWriteRepository<Message> writeRepository,
            IHubContext<ChatHub> hubContext)
        {
            _writeRepository = writeRepository;
            _hubContext = hubContext;
        }

        public async Task<SendMessageCommandResponse> Handle(SendMessageCommand request, CancellationToken cancellationToken)
        {
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
