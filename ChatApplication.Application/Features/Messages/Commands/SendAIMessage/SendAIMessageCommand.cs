using MediatR;

namespace ChatApplication.Application.Features.Messages.Commands.SendAIMessage
{
    public class SendAIMessageCommand : IRequest<SendAIMessageCommandResponse>
    {
        public string UserId { get; set; }
        public string Message { get; set; }
    }
}