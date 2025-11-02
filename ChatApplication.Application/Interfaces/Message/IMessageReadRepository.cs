using ChatApplication.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Interfaces.Message
{
    public interface IMessageReadRepository : IReadRepository<Domain.Entities.Message>
    {
        Task<List<Domain.Entities.Message>> GetMessagesAsync(string UserId1, string UserId2);
        Task<int> GetUnreadMessageCountAsync(string userId);
        Task<List<Domain.Entities.Message>> GetUnreadMessagesAsync(string userId);
        Task<Domain.Entities.Message?> GetLatestMessageAsync(string userId1, string userId2); // Yeni metod
    }
}
