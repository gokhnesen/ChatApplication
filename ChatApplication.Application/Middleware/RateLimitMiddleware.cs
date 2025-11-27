using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;

namespace ChatApplication.Application.Middleware
{
    public class RateLimitMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RateLimitMiddleware> _logger;

        // Per-partition FixedWindow limiters (partitioned by user id or IP)
        private static readonly ConcurrentDictionary<string, FixedWindowRateLimiter> _limiters = new();

        // Configure limits here
        private const int PermitLimit = 600;
        private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

        public RateLimitMiddleware(RequestDelegate next, ILogger<RateLimitMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Partition key: authenticated user id or remote IP
                var userId = context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                var partitionKey = !string.IsNullOrEmpty(userId)
                    ? userId
                    : context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                // Get or create limiter for partition
                var limiter = _limiters.GetOrAdd(partitionKey, _ =>
                    new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = PermitLimit,
                        Window = Window,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

                // Try acquire a permit
                using var lease = await limiter.AcquireAsync(1, context.RequestAborted);
                if (!lease.IsAcquired)
                {
                    // Rejected -> return JSON 429 like the previous Program.cs configuration
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.ContentType = "application/json";
                    var payload = JsonSerializer.Serialize(new { IsSuccess = false, Message = "Too many requests. Please try again later." });
                    await context.Response.WriteAsync(payload, CancellationToken.None);
                    _logger.LogWarning("Rate limit exceeded for partition {PartitionKey}", partitionKey);
                    return;
                }

                // Permit acquired -> continue pipeline
                await _next(context);
            }
            catch (OperationCanceledException)
            {
                // request was aborted
                context.Response.StatusCode = StatusCodes.Status499ClientClosedRequest; // optional
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RateLimitMiddleware error");
                // don't swallow: let downstream or global exception handler run
                throw;
            }
        }
    }
}