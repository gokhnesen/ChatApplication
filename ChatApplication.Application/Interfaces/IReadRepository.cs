using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Interfaces
{
    public interface IReadRepository<T> where T: class
    {
        IQueryable<T> GetAll(bool tracking = true);
        Task<T> GetByIdAsync(Guid Id, bool tracking = true);
    }
}
