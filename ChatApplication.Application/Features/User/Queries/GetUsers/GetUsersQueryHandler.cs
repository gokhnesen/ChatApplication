using ChatApplication.Application.Interfaces.Friend;
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
        private readonly IFriendReadRepository _friendReadRepository;

        public GetUsersQueryHandler(
            UserManager<ApplicationUser> userManager,
            ILogger<GetUsersQueryHandler> logger,
            IFriendReadRepository friendReadRepository)
        {
            _userManager = userManager;
            _logger = logger;
            _friendReadRepository = friendReadRepository;
        }

        public async Task<List<GetUsersResponse>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Kullanicilar getiriliyor. SearchTerm: {SearchTerm}, ExcludeUserId: {ExcludeUserId}", 
                    request.SearchTerm, request.ExcludeUserId);

                var query = _userManager.Users.AsQueryable();

                if (!string.IsNullOrWhiteSpace(request.ExcludeUserId))
                {
                    query = query.Where(u => u.Id != request.ExcludeUserId);

                    var blockedUserIds = await _friendReadRepository.GetAll(false)
                        .Where(f => (f.SenderId == request.ExcludeUserId || f.ReceiverId == request.ExcludeUserId)
                                    && f.Status == FriendStatus.Engellendi)
                        .Select(f => f.SenderId == request.ExcludeUserId ? f.ReceiverId : f.SenderId)
                        .ToListAsync(cancellationToken);

                    _logger.LogInformation("Engellenen kullanıcı sayısı: {Count}", blockedUserIds.Count);

                    if (blockedUserIds.Any())
                    {
                        query = query.Where(u => !blockedUserIds.Contains(u.Id));
                    }
                }

                if (!string.IsNullOrWhiteSpace(request.SearchTerm))
                {
                    var searchTerm = request.SearchTerm.Trim();
                    query = query.Where(u =>
                        u.Name.StartsWith(searchTerm) ||
                        u.LastName.StartsWith(searchTerm) ||
                        (u.UserName != null && u.UserName.StartsWith(searchTerm)) ||
                        (u.Email != null && u.Email.StartsWith(searchTerm)) ||
                        u.Name.Contains(searchTerm) ||
                        u.LastName.Contains(searchTerm) ||
                        (u.UserName != null && u.UserName.Contains(searchTerm)) ||
                        (u.Email != null && u.Email.Contains(searchTerm)) ||
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

                _logger.LogInformation("Toplam {Count} kullanıcı bulundu", users.Count);

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
                _logger.LogError(ex, "Kullanıcıları getirirken hata oluştu");
                return new List<GetUsersResponse>();
            }
        }
    }
}