using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Interfaces.Friend
{
    public interface IFriendReadRepository : IReadRepository<Domain.Entities.Friend>
    {
        Task<List<Domain.Entities.Friend>> GetFriendsAsync(string userId);
        Task<List<Domain.Entities.Friend>> GetPendingRequestsAsync(string userId);
        Task<Domain.Entities.Friend> GetFriendRequestAsync(string senderId, string receiverId);
    
    }
}
