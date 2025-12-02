using MediatR;
using System.Collections.Generic;

namespace ChatApplication.Application.Features.Friend.Queries.GetPendingRequests
{
    public class GetPendingRequestsQuery : IRequest<List<GetPendingRequestsResponse>>
    {
        public string? UserId { get; set; } = string.Empty;
    }
}