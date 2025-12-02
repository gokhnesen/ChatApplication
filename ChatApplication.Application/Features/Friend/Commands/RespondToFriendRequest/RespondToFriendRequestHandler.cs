using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.Friend.Commands.RespondToFriendRequest
{
    public class RespondToFriendRequestHandler : IRequestHandler<RespondToFriendRequestCommand, RespondToFriendRequestResponse>
    {
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<RespondToFriendRequestHandler> _logger;
        private readonly IHubContext<ChatHub> _hubContext;

        public RespondToFriendRequestHandler(
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<RespondToFriendRequestHandler> logger,
            IHubContext<ChatHub> hubContext)
        {
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
            _hubContext = hubContext;
        }

        public async Task<RespondToFriendRequestResponse> Handle(RespondToFriendRequestCommand request, CancellationToken cancellationToken)
        {
            _logger.LogInformation("Arkada?l?k iste?ine cevap veriliyor: {FriendshipId}, Al?c?: {ReceiverId}, Kabul: {Accept}",
                request.FriendshipId, request.ReceiverId, request.Accept);

            var friendship = await _friendReadRepository.GetByIdAsync(request.FriendshipId);
            if (friendship == null)
            {
                throw new NotFoundException(nameof(friendship), request.FriendshipId);
            }

            if (friendship.ReceiverId != request.ReceiverId)
            {
                throw new UnauthorizedException("Bu iste?e cevap verme yetkiniz yok.");
            }

            friendship.Status = request.Accept ? FriendStatus.Onaylandi : FriendStatus.Rededildi;
            if (request.Accept)
            {
                friendship.AcceptedDate = DateTime.UtcNow;
            }

            if (friendship.Status == FriendStatus.Onaylandi)
            {
                var notifyInfo = new
                {
                    friendshipId = friendship.Id,
                    senderId = friendship.SenderId,
                    senderName = friendship.Sender?.Name,
                    senderLastName = friendship.Sender?.LastName,
                    senderEmail = friendship.Sender?.Email,
                    senderProfilePhotoUrl = friendship.Sender?.ProfilePhotoUrl,
                    receiverId = friendship.ReceiverId,
                    receiverName = friendship.Receiver?.Name,
                    receiverLastName = friendship.Receiver?.LastName,
                    receiverEmail = friendship.Receiver?.Email,
                    receiverProfilePhotoUrl = friendship.Receiver?.ProfilePhotoUrl,
                    acceptedDate = friendship.AcceptedDate
                };

                await _hubContext.Clients.User(friendship.SenderId)
                    .SendAsync("FriendRequestAccepted", notifyInfo, cancellationToken);

                await _hubContext.Clients.User(friendship.ReceiverId)
                    .SendAsync("FriendRequestAccepted", notifyInfo, cancellationToken);
            }

            await _friendWriteRepository.UpdateAsync(friendship);
            await _friendWriteRepository.SaveAsync();

            string message = request.Accept
                ? "Arkada?l?k iste?i kabul edildi."
                : "Arkada?l?k iste?i reddedildi.";

            return new RespondToFriendRequestResponse
            {
                IsSuccess = true,
                Message = message
            };
        }
    }
}