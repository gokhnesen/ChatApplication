using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Queries.GetUserInfo
{
    public class GetUserInfoQuery : IRequest<GetUserInfoQueryResponse>
    {
    }
}
