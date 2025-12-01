using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http; 
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace ChatApplication.Application.Features.User.Queries.GetUsers
{
    public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, List<GetUsersQueryResponse>>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IHttpContextAccessor _httpContextAccessor; 
        private readonly ILogger<GetUsersQueryHandler> _logger;

        public GetUsersQueryHandler(
            UserManager<ApplicationUser> userManager,
            IFriendReadRepository friendReadRepository,
            IHttpContextAccessor httpContextAccessor,
            ILogger<GetUsersQueryHandler> logger)
        {
            _userManager = userManager;
            _friendReadRepository = friendReadRepository;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<List<GetUsersQueryResponse>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
        {
            var currentUserId = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

 

            _logger.LogInformation("GetUsers isteği. User: {UserId}, Search: {Search}", currentUserId, request.SearchTerm);

            var query = _userManager.Users.AsQueryable();

            if (!string.IsNullOrEmpty(currentUserId))
            {
                query = query.Where(u => u.Id != currentUserId);

                var blockedUserIds = await _friendReadRepository.GetAll(false)
                    .Where(f => (f.SenderId == currentUserId || f.ReceiverId == currentUserId)
                                && f.Status == FriendStatus.Engellendi)
                    .Select(f => f.SenderId == currentUserId ? f.ReceiverId : f.SenderId)
                    .ToListAsync(cancellationToken);

                if (request.OnlyBlocked)
                {
                    if (!blockedUserIds.Any()) return new List<GetUsersQueryResponse>();
                    query = query.Where(u => blockedUserIds.Contains(u.Id));
                }
                else if (request.IncludeBlocked != true) 
                {
                    if (blockedUserIds.Any())
                    {
                        query = query.Where(u => !blockedUserIds.Contains(u.Id));
                    }
                }
            }
            else if (request.OnlyBlocked)
            {
                throw new BusinessException("AUTH_REQUIRED", "Engellenen kullanıcıları görmek için giriş yapmalısınız.");
            }

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.Trim();
                query = query.Where(u =>
                    u.Name.Contains(term) ||
                    u.LastName.Contains(term) ||
                    (u.UserName != null && u.UserName.Contains(term)) ||
                    (u.Email != null && u.Email.Contains(term))
                );
            }

            query = query.OrderBy(u => u.Name).ThenBy(u => u.LastName);

            if (request.PageNumber.HasValue && request.PageSize.HasValue)
            {
                var page = Math.Max(1, request.PageNumber.Value);
                var size = Math.Max(1, Math.Min(100, request.PageSize.Value));
                query = query.Skip((page - 1) * size).Take(size);
            }

            return await query
                .Select(u => new GetUsersQueryResponse
                {
                    Id = u.Id,
                    Name = u.Name,
                    LastName = u.LastName,
                    Email = u.Email ?? string.Empty,
                    UserName = u.UserName ?? string.Empty,
                    FriendCode = u.FriendCode ?? string.Empty,
                    ProfilePhotoUrl = u.ProfilePhotoUrl
                })
                .ToListAsync(cancellationToken);
        }
    }
}