using MediatR;

public class MarkMessagesAsReadCommand : IRequest<MarkMessagesAsReadCommandResponse>
{
    public string UserId { get; set; }
    public string SenderId { get; set; }
}