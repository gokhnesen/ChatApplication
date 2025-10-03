using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Messages.Queries.GetMessages
{
    public class GetMessagesQuery : IRequest<List<GetMessagesQueryResponse>>
    {
        public string UserId1 { get; set; }
        public string UserId2 { get; set; }
    }
}
