using ChatApplication.Application.Interfaces.Friend;
using MediatR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Queries.GetPendingRequests
{
    public class GetPendingRequestsHandler : IRequestHandler<GetPendingRequestsQuery, List<GetPendingRequestsResponse>>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly ILogger<GetPendingRequestsHandler> _logger;

        public GetPendingRequestsHandler(
            IFriendReadRepository friendReadRepository,
            ILogger<GetPendingRequestsHandler> logger)
        {
            _friendReadRepository = friendReadRepository;
            _logger = logger;
        }

        public async Task<List<GetPendingRequestsResponse>> Handle(GetPendingRequestsQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Bekleyen arkada?l?k istekleri getiriliyor: {UserId}", request.UserId);

                var pendingRequests = await _friendReadRepository.GetPendingRequestsAsync(request.UserId);
                
                return pendingRequests.Select(fr => new GetPendingRequestsResponse
                {
                    FriendshipId = fr.Id,
                    SenderId = fr.SenderId,
                    SenderName = fr.Sender?.Name ?? string.Empty,
                    SenderLastName = fr.Sender?.LastName ?? string.Empty,
                    SenderEmail = fr.Sender?.Email ?? string.Empty,
                    RequestDate = fr.RequestDate
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bekleyen arkada?l?k isteklerini getirirken hata olu?tu");
                return new List<GetPendingRequestsResponse>();
            }
        }
    }
}