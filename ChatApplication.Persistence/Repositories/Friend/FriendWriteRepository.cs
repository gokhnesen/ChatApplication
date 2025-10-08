    using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Persistence.DbContext;

namespace ChatApplication.Persistence.Repositories.Friend
{
    public class FriendWriteRepository : WriteRepository<Domain.Entities.Friend>, IFriendWriteRepository
    {
        public FriendWriteRepository(ChatAppDbContext context) : base(context)
        {
        }
    }
}
