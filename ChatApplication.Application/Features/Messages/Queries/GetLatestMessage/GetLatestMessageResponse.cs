namespace ChatApplication.Application.Features.Messages.Queries.GetLatestMessage
{
    public class GetLatestMessageResponse
    {
        public string? Id { get; set; }
        public string? SenderId { get; set; }
        public string? ReceiverId { get; set; }
        public string? Content { get; set; }
        public DateTime? SentAt { get; set; }
        public bool IsRead { get; set; }
        public bool HasMessage { get; set; } // Mesaj var m? kontrolü
    }
}