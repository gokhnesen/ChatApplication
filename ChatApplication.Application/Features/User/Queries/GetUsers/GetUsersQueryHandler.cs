using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Queries.GetUsers
{
    public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, List<GetUsersResponse>>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<GetUsersQueryHandler> _logger;

        public GetUsersQueryHandler(
            UserManager<ApplicationUser> userManager,
            ILogger<GetUsersQueryHandler> logger)
        {
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<List<GetUsersResponse>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Kullan?c?lar getiriliyor. SearchTerm: {SearchTerm}", request.SearchTerm);

                var query = _userManager.Users.AsQueryable();

                if (!string.IsNullOrWhiteSpace(request.ExcludeUserId))
                {
                    query = query.Where(u => u.Id != request.ExcludeUserId);
                }

                if (!string.IsNullOrWhiteSpace(request.SearchTerm))
                {
                    var searchTerm = request.SearchTerm.Trim();
                    query = query.Where(u =>
                        u.Name.StartsWith(searchTerm) ||
                        u.LastName.StartsWith(searchTerm) ||
                        u.UserName.StartsWith(searchTerm) ||
                        u.Email.StartsWith(searchTerm) ||
                        u.Name.Contains(searchTerm) ||
                        u.LastName.Contains(searchTerm) ||
                        u.UserName.Contains(searchTerm) ||
                        u.Email.Contains(searchTerm) ||
                        u.FriendCode.Contains(searchTerm)
                    );

                }

                if (request.PageNumber.HasValue && request.PageSize.HasValue)
                {
                    var pageNumber = Math.Max(1, request.PageNumber.Value);
                    var pageSize = Math.Max(1, Math.Min(100, request.PageSize.Value));
                    
                    query = query
                        .Skip((pageNumber - 1) * pageSize)
                        .Take(pageSize);
                }

                var users = await query
                    .OrderBy(u => u.Name)
                    .ThenBy(u => u.LastName)
                    .ToListAsync(cancellationToken);

                _logger.LogInformation("{Count} kullan?c? bulundu", users.Count);

                return users.Select(u => new GetUsersResponse
                {
                    Id = u.Id,
                    Name = u.Name,
                    LastName = u.LastName,
                    Email = u.Email ?? string.Empty,
                    UserName = u.UserName ?? string.Empty,
                    FriendCode = u.FriendCode ?? string.Empty,
                    ProfilePhotoUrl = u.ProfilePhotoUrl
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kullan?c?lar? getirirken hata olu?tu");
                return new List<GetUsersResponse>();
            }
        }
    }
}