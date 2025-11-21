using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.UnBlockFriend
{
    public class UnBlockFriendOrUserCommand : IRequest<UnBlockFriendOrUserCommandResponse>
    {

        public string BlockerId { get; set; } = string.Empty;
        public string BlockedUserId { get; set; } = string.Empty;
    }
}
