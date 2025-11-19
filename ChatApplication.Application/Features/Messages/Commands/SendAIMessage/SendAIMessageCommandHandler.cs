using ChatApplication.Application.Features.Messages.Commands.SendMessage;
using MediatR;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace ChatApplication.Application.Features.Messages.Commands.SendAIMessage
{
    public class SendAIMessageCommandHandler : IRequestHandler<SendAIMessageCommand, SendAIMessageCommandResponse>
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        public SendAIMessageCommandHandler(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task<SendAIMessageCommandResponse> Handle(SendAIMessageCommand request, CancellationToken cancellationToken)
        {
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
                    role = "user", // Mesaj? gönderen rolü
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
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new SendAIMessageCommandResponse
                {
                    Response = $"API Hata Kodu: {(int)response.StatusCode} - ?çerik: {responseContent.Substring(0, Math.Min(responseContent.Length, 200))}..."
                };
            }

            string geminiMessage = "Yapay zekadan yan?t al?namad?.";

            try
            {
                using var doc = JsonDocument.Parse(responseContent);

                var candidates = doc.RootElement.GetProperty("candidates");

                if (candidates.GetArrayLength() > 0)
                {
                    geminiMessage = candidates[0]
                                        .GetProperty("content")
                                        .GetProperty("parts")[0]
                                        .GetProperty("text").GetString();
                }
            }
            catch (Exception ex)
            {
                geminiMessage = $"Yan?t çözümlenirken bir hata olu?tu (JSON format? hatas?): {ex.Message}";
            }

            return new SendAIMessageCommandResponse
            {
                Response = geminiMessage
            };
        }
    }
}