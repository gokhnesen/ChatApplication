using MediatR;
using ChatApplication.Application.SignalR;
using ChatApplication.Application.Interfaces;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Messages.Commands
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
                IsRead = false
            };

            await _writeRepository.AddAsync(message);
            await _writeRepository.SaveAsync();

            await _hubContext.Clients.User(request.ReceiverId)
                .SendAsync("ReceiveMessage", request.SenderId, request.Content);

            return new SendMessageCommandResponse
            {
                SenderId = message.SenderId,
                ReceiverId = message.ReceiverId,
                Content = message.Content
            };
        }
    }
}
