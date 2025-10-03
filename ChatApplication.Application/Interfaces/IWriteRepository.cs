using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Interfaces
{
    public interface IWriteRepository<T> where T: class
    {
        Task<bool> AddAsync(T model);
        Task<bool> AddRangeAsync(List<T> models);
        bool Remove(T model);
        Task<bool> RemoveAsync(string id);

        Task<bool> UpdateAsync(T model);

        Task<int> SaveAsync();

    }
}
