using MediatR;

public class MarkMessagesAsReadCommand : IRequest<MarkMessagesAsReadResponse>
{
    public string UserId { get; set; }
    public string SenderId { get; set; }
}