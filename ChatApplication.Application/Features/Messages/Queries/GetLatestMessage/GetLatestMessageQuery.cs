using MediatR;

namespace ChatApplication.Application.Features.Messages.Queries.GetLatestMessage
{
    public class GetLatestMessageQuery : IRequest<GetLatestMessageResponse>
    {
        public string UserId1 { get; set; }
        public string UserId2 { get; set; }
    }
}