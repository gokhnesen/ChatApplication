using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Domain.Entities;
using ChatApplication.Persistence.DbContext;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ChatApplication.Persistence.Repositories.Message
{
    public class MessageReadRepository : ReadRepository<Domain.Entities.Message>, IMessageReadRepository
    {

        public MessageReadRepository(ChatAppDbContext context) 
            : base(context)
        {
        }

        public async Task<List<Domain.Entities.Message>> GetMessagesAsync(string userId1, string userId2)
        {
            var allMessages = await Table.ToListAsync();
            Console.WriteLine($"Veritabanında toplam {allMessages.Count} mesaj var");
            
            foreach (var msg in allMessages.Take(5))
            {
                Console.WriteLine($"Mesaj: ID={msg.Id}, SenderId='{msg.SenderId}', ReceiverId='{msg.ReceiverId}'");
            }
            
            var messages = await Table
                .Where(m => (m.SenderId.Contains(userId1) && m.ReceiverId.Contains(userId2)) ||
                            (m.SenderId.Contains(userId2) && m.ReceiverId.Contains(userId1)))
                .OrderBy(m => m.SentAt)
                .ToListAsync();
            
            Console.WriteLine($"Esnek eşleştirme ile {messages.Count} mesaj bulundu");
            
            return messages;
        }

        public async Task<int> GetUnreadMessageCountAsync(string userId)
        {
            return await Table
        .CountAsync(m => m.ReceiverId == userId && !m.IsRead);
        }

        public async Task<List<Domain.Entities.Message>> GetUnreadMessagesAsync(string userId)
        {
            return await Table
    .Include(m => m.Sender)
    .Where(m => m.ReceiverId == userId && !m.IsRead)
    .OrderByDescending(m => m.SentAt)
    .ToListAsync();
        }

        public async Task<Domain.Entities.Message?> GetLatestMessageAsync(string userId1, string userId2)
        {
            return await Table
                .Where(m => (m.SenderId == userId1 && m.ReceiverId == userId2) ||
                           (m.SenderId == userId2 && m.ReceiverId == userId1))
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync();
        }
    }
}
