using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces.Friend;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace ChatApplication.Application.Features.Friend.Queries.GetPendingRequests
{
    public class GetPendingRequestsQueryHandler : IRequestHandler<GetPendingRequestsQuery, List<GetPendingRequestsResponse>>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly ILogger<GetPendingRequestsQueryHandler> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GetPendingRequestsQueryHandler(
            IFriendReadRepository friendReadRepository,
            ILogger<GetPendingRequestsQueryHandler> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _friendReadRepository = friendReadRepository;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<List<GetPendingRequestsResponse>> Handle(GetPendingRequestsQuery request, CancellationToken cancellationToken)
        {
            var userId = string.IsNullOrWhiteSpace(request.UserId)
                ? _httpContextAccessor?.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                : request.UserId;

            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogWarning("GetPendingRequests called without authenticated user");
                throw new UnauthorizedException("Kullan?c? giri?i bulunamad?.");
            }

            _logger.LogInformation("Bekleyen arkada?l?k istekleri getiriliyor: {UserId}", userId);

            var pendingRequests = await _friendReadRepository.GetPendingRequestsAsync(userId);

            return pendingRequests.Select(fr => new GetPendingRequestsResponse
            {
                FriendshipId = fr.Id,
                SenderId = fr.SenderId,
                SenderName = fr.Sender?.Name ?? string.Empty,
                SenderLastName = fr.Sender?.LastName ?? string.Empty,
                SenderProfilePhotoUrl = fr.Sender?.ProfilePhotoUrl ?? string.Empty,
                SenderEmail = fr.Sender?.Email ?? string.Empty,
                RequestDate = fr.RequestDate
            }).ToList();
        }
    }
}