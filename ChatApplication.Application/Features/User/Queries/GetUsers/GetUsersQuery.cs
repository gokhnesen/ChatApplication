using MediatR;
using System.Collections.Generic;

namespace ChatApplication.Application.Features.User.Queries.GetUsers
{
    public class GetUsersQuery : IRequest<List<GetUsersResponse>>
    {
        public string? SearchTerm { get; set; }
        public string? ExcludeUserId { get; set; }
        public int? PageNumber { get; set; }
        public int? PageSize { get; set; }
    }
}