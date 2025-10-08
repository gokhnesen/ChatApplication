using MediatR;
using System.Collections.Generic;

namespace ChatApplication.Application.Features.Friend.Queries.GetFriends
{
    public class GetFriendsQuery : IRequest<List<GetFriendsResponse>>
    {
        public string UserId { get; set; } = string.Empty;
    }
}