using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using ChatApplication.Persistence.DbContext;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ChatApplication.Persistence.Repositories.Friend
{
    public class FriendReadRepository : ReadRepository<Domain.Entities.Friend>, IFriendReadRepository
    {
        public FriendReadRepository(ChatAppDbContext context) : base(context)
        {
        }

        public async Task<List<Domain.Entities.Friend>> GetFriendsAsync(string userId)
        {
            return await Table
                .Where(f => (f.SenderId == userId || f.ReceiverId == userId) && 
                           f.Status == FriendStatus.Onaylandi)
                .Include(f => f.Sender)
                .Include(f => f.Receiver)
                .ToListAsync();
        }

        public async Task<List<Domain.Entities.Friend>> GetPendingRequestsAsync(string userId)
        {
            return await Table
                .Where(f => f.ReceiverId == userId && f.Status == FriendStatus.Beklemede)
                .Include(f => f.Sender)
                .ToListAsync();
        }

        public async Task<Domain.Entities.Friend> GetFriendRequestAsync(string senderId, string receiverId)
        {
            return await Table
                .FirstOrDefaultAsync(f =>
                    (f.SenderId == senderId && f.ReceiverId == receiverId) ||
                    (f.SenderId == receiverId && f.ReceiverId == senderId));
        }
    }
}
