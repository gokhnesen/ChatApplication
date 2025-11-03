using ChatApplication.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ChatApplication.Application.Interfaces.User
{
    public interface IUserReadRepository : IReadRepository<ApplicationUser>
    {
        Task<List<ApplicationUser>> GetUsersAsync(
            string? searchTerm = null,
            string? excludeUserId = null,
            int? pageNumber = null,
            int? pageSize = null);
    }
}