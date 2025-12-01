using ChatApplication.Application.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace ChatApplication.Application.Middleware
{
    public class GlobalExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

        public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var response = new ErrorResponse
            {
                TraceId = context.TraceIdentifier,
                Timestamp = DateTime.UtcNow
            };

            switch (exception)
            {
                case ValidationException validationEx:
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    response.Code = validationEx.Code;
                    response.Message = validationEx.UserFriendlyMessage;
                    response.Errors = validationEx.Errors;
                    _logger.LogWarning(validationEx, "Doğrulama hatası: {Errors}", 
                        JsonSerializer.Serialize(validationEx.Errors));
                    break;

                case NotFoundException notFoundEx:
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    response.Code = notFoundEx.Code;
                    response.Message = notFoundEx.UserFriendlyMessage;
                    _logger.LogWarning(notFoundEx, "Kayıt bulunamadı: {Message}", notFoundEx.Message);
                    break;

                case UnauthorizedException unauthorizedEx:
                    context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    response.Code = unauthorizedEx.Code;
                    response.Message = unauthorizedEx.UserFriendlyMessage;
                    _logger.LogWarning(unauthorizedEx, "Yetkisiz erişim: {Message}", unauthorizedEx.Message);
                    break;

                case BusinessException businessEx:
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    response.Code = businessEx.Code;
                    response.Message = businessEx.UserFriendlyMessage;
                    _logger.LogWarning(businessEx, "İş kuralı hatası: {Message}", businessEx.Message);
                    break;

                default:
                    context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                    response.Code = "INTERNAL_ERROR";
                    response.Message = "İşlem sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
                    _logger.LogError(exception, "Beklenmeyen hata: {Message}", exception.Message);
                    break;
            }

            var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await context.Response.WriteAsync(jsonResponse);
        }

        private class ErrorResponse
        {
            public string Code { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
            public string TraceId { get; set; } = string.Empty;
            public DateTime Timestamp { get; set; }
            public object? Errors { get; set; }
        }
    }
}