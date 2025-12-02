using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Features.Messages.Commands.SendMessage;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace ChatApplication.Application.Features.Messages.Commands.SendAIMessage
{
    public class SendAIMessageCommandHandler : IRequestHandler<SendAIMessageCommand, SendAIMessageCommandResponse>
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SendAIMessageCommandHandler(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<SendAIMessageCommandResponse> Handle(SendAIMessageCommand request, CancellationToken cancellationToken)
        {
            var userId = request.UserId;
            if (string.IsNullOrEmpty(userId))
            {
                userId = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    throw new UnauthorizedException();
                }

                request.UserId = userId;
            }

            var client = _httpClientFactory.CreateClient();

            var apiKey = _configuration["Gemini:ApiKey"];
            var baseUrl = _configuration["Gemini:Endpoint"];

            var endpoint = $"{baseUrl}?key={apiKey}";

            var payload = new
            {
                contents = new[]
                {
                        new
                        {
                            role = "user",
                            parts = new[]
                            {
                                new { text = request.Message }
                            }
                        }
                    }
            };

            var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = content
            };

            var response = await client.SendAsync(httpRequest, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var snippet = responseContent is null ? string.Empty : responseContent.Substring(0, Math.Min(responseContent.Length, 200));
                throw new BusinessException(
                    "AI_API_ERROR",
                    $"API Hata Kodu: {(int)response.StatusCode} - İçerik: {snippet}...",
                    "Yapay zeka servisiyle iletişimde hata oluştu.");
            }

            string geminiMessage = "Yapay zekadan yanıt alınamadı.";

            using var doc = JsonDocument.Parse(responseContent);

            if (doc.RootElement.TryGetProperty("candidates", out var candidatesElement) &&
                candidatesElement.ValueKind == JsonValueKind.Array &&
                candidatesElement.GetArrayLength() > 0)
            {
                var first = candidatesElement[0];

                if (first.TryGetProperty("content", out var contentElement) &&
                    contentElement.TryGetProperty("parts", out var partsElement) &&
                    partsElement.ValueKind == JsonValueKind.Array &&
                    partsElement.GetArrayLength() > 0)
                {
                    var part = partsElement[0];
                    if (part.TryGetProperty("text", out var textElement) && textElement.ValueKind == JsonValueKind.String)
                    {
                        geminiMessage = textElement.GetString() ?? geminiMessage;
                    }
                }
            }

            return new SendAIMessageCommandResponse
            {
                Response = geminiMessage
            };
        }
    }
}