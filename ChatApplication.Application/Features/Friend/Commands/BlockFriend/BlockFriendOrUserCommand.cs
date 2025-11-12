using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.BlockFriend
{
    public class BlockFriendOrUserCommand : IRequest<BlockFriendOrUserCommandResponse>
    {
        public string BlockerId { get; set; } = string.Empty;
        public string BlockedUserId { get; set; } = string.Empty;
    }
}
