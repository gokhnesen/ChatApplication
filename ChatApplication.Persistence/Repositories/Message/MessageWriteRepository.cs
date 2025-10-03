using ChatApplication.Application.Interfaces;
using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Persistence.DbContext;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Persistence.Repositories.Messages
{
    public class MessageWriteRepository : WriteRepository<Domain.Entities.Message>, IMessageWriteRepository
    {
        public MessageWriteRepository(ChatAppDbContext context) : base(context)
        {
        }
    }
}
