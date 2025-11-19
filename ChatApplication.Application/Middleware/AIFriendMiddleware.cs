using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Middleware
{
    public class AIFriendMiddleware
    {
        private readonly RequestDelegate _next;
        private const string AiUserId = "ai-bot";

        public AIFriendMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // proceed immediately if not authenticated
            if (context.User?.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId) || userId == AiUserId)
            {
                await _next(context);
                return;
            }

            // create a scope to resolve scoped services
            using var scope = context.RequestServices.CreateScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var friendRead = scope.ServiceProvider.GetRequiredService<IFriendReadRepository>();
            var friendWrite = scope.ServiceProvider.GetRequiredService<IFriendWriteRepository>();

            // ensure AI user exists
            var aiUser = await userManager.FindByIdAsync(AiUserId);
            if (aiUser == null)
            {
                var ai = new ApplicationUser
                {
                    Id = AiUserId,
                    UserName = "ai-bot",
                    Email = "ai-bot@local",
                    EmailConfirmed = true,
                    Name = "AI",
                    LastName = "Bot",
                    // you may set other properties if required
                };

                // create with a strong random password (not used for sign-in)
                var pw = Guid.NewGuid().ToString("N") + "Aa1!";
                var createResult = await userManager.CreateAsync(ai, pw);
                // ignore failure — if it fails later logic will still attempt friendship checks
            }

            // ensure friendship exists (either direction)
            var existing = await friendRead.GetFriendRequestAsync(userId, AiUserId);
            if (existing == null)
            {
                // try other direction as well to prevent duplicates
                existing = await friendRead.GetFriendRequestAsync(AiUserId, userId);
            }

            if (existing == null)
            {
                var friendship = new Friend
                {
                    SenderId = userId,
                    ReceiverId = AiUserId,
                    Status = FriendStatus.Onaylandi,
                    RequestDate = DateTime.UtcNow,
                    AcceptedDate = DateTime.UtcNow
                };

                await friendWrite.AddAsync(friendship);
                await friendWrite.SaveAsync();
            }

            await _next(context);
        }
    }
}
