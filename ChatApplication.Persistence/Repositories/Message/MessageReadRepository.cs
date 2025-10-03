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
        private readonly ILogger<MessageReadRepository> _logger;

        public MessageReadRepository(ChatAppDbContext context, ILogger<MessageReadRepository> logger = null) 
            : base(context)
        {
            _logger = logger;
        }

        public async Task<List<Domain.Entities.Message>> GetMessagesAsync(string userId1, string userId2)
        {
            // Tüm mesajları getirin ve içeriğe bakalım
            var allMessages = await Table.ToListAsync();
            Console.WriteLine($"Veritabanında toplam {allMessages.Count} mesaj var");
            
            foreach (var msg in allMessages.Take(5))
            {
                Console.WriteLine($"Mesaj: ID={msg.Id}, SenderId='{msg.SenderId}', ReceiverId='{msg.ReceiverId}'");
            }
            
            // Esnek eşleştirme deneyin (Contains kullanarak)
            var messages = await Table
                .Where(m => (m.SenderId.Contains(userId1) && m.ReceiverId.Contains(userId2)) ||
                            (m.SenderId.Contains(userId2) && m.ReceiverId.Contains(userId1)))
                .OrderBy(m => m.SentAt)
                .ToListAsync();
            
            Console.WriteLine($"Esnek eşleştirme ile {messages.Count} mesaj bulundu");
            
            return messages;
        }
    }
}
