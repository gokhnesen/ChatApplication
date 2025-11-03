using ChatApplication.Application.Interfaces.Friend;
using MediatR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ChatApplication.Domain.Entities;

namespace ChatApplication.Application.Features.Friend.Queries.GetFriends
{
    public class GetFriendsQueryHandler : IRequestHandler<GetFriendsQuery, List<GetFriendsResponse>>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly ILogger<GetFriendsQueryHandler> _logger;

        public GetFriendsQueryHandler(
            IFriendReadRepository friendReadRepository,
            ILogger<GetFriendsQueryHandler> logger)
        {
            _friendReadRepository = friendReadRepository;
            _logger = logger;
        }

        public async Task<List<GetFriendsResponse>> Handle(GetFriendsQuery request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Kullan?c?n?n arkada?lar? getiriliyor: {UserId}", request.UserId);

                var friendships = await _friendReadRepository.GetFriendsAsync(request.UserId);
                var friends = new List<GetFriendsResponse>();

                foreach (var friendship in friendships)
                {
                    // Arkada? olan kullan?c?y? belirle (gönderen ya da al?c?)
                    ApplicationUser? friend = null;
                    
                    if (friendship.SenderId == request.UserId)
                    {
                        friend = friendship.Receiver; // Kullan?c? gönderen ise, arkada? al?c?d?r
                    }
                    else
                    {
                        friend = friendship.Sender; // Kullan?c? al?c? ise, arkada? gönderendir
                    }
                    
                    if (friend != null)
                    {
                        friends.Add(new GetFriendsResponse
                        {
                            Id = friend.Id,
                            Name = friend.Name,
                            LastName = friend.LastName,
                            Email = friend.Email,
                            UserName = friend.UserName
                        });
                    }
                }

                return friends;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Arkada?lar? getirirken hata olu?tu");
                return new List<GetFriendsResponse>();
            }
        }
    }
}