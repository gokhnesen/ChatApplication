using MediatR;

namespace ChatApplication.Application.Features.Messages.Queries.GetLatestMessage
{
    public class GetLatestMessageQuery : IRequest<GetLatestMessageQueryResponse>
    {
        public string UserId1 { get; set; }
        public string UserId2 { get; set; }
    }
}