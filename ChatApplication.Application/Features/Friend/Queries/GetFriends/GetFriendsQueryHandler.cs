using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace ChatApplication.Application.Features.Friend.Queries.GetFriends
{
    public class GetFriendsQueryHandler : IRequestHandler<GetFriendsQuery, List<GetFriendsResponse>>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly ILogger<GetFriendsQueryHandler> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GetFriendsQueryHandler(
            IFriendReadRepository friendReadRepository,
            ILogger<GetFriendsQueryHandler> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _friendReadRepository = friendReadRepository;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<List<GetFriendsResponse>> Handle(GetFriendsQuery request, CancellationToken cancellationToken)
        {
            var userId = string.IsNullOrWhiteSpace(request.UserId)
                ? _httpContextAccessor?.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                : request.UserId;

            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogWarning("GetFriends called without authenticated user");
                throw new UnauthorizedException("Kullan?c? giri?i bulunamad?.");
            }

            _logger.LogInformation("Kullanicinin arkadaslari getiriliyor: {UserId}", userId);

            var friendships = await _friendReadRepository.GetFriendsAsync(userId);
            var friends = friendships.Select(friendship =>
            {
                ApplicationUser? friend = friendship.SenderId == userId ? friendship.Receiver : friendship.Sender;
                if (friend == null) return null;
                return new GetFriendsResponse
                {
                    Id = friend.Id,
                    Name = friend.Name,
                    LastName = friend.LastName,
                    Email = friend.Email,
                    UserName = friend.UserName,
                    ProfilePhotoUrl = friend.ProfilePhotoUrl
                };
            }).Where(x => x != null).Select(x => x!).ToList();

            return friends;
        }
    }
}