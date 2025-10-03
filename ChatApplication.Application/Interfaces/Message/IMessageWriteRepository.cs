using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Interfaces.Message
{
    public interface IMessageWriteRepository : IWriteRepository<Domain.Entities.Message>
    {
    }
}
