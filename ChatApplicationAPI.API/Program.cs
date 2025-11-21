using ChatApplication.Application;
using ChatApplication.Application.Middleware;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using ChatApplication.Persistence;
using ChatApplication.Persistence.DbContext;
using ChatApplication.Persistence.DbContext.Seed;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;

namespace ChatApplicationAPI.API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // --- 1. Temel Servisler ---
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();

            // Swagger Ayarları
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Chat Application API",
                    Version = "v1",
                    Description = "Gerçek zamanlı mesajlaşma uygulaması API'si"
                });
                c.OperationFilter<FileUploadOperationFilter>();
            });

            builder.Services.AddOpenApi();
            builder.Services.AddApplicationServices();
            builder.Services.AddPersistenceServices(builder.Configuration);
            builder.Services.AddSignalR();

            // --- 2. Identity Kurulumu ---
            // Not: MapIdentityApi kullanıyorsan AddIdentityApiEndpoints doğru tercihtir.
            builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<ChatAppDbContext>();

            // --- 3. Authentication ve External Login Ayarları (KRİTİK KISIM) ---
            builder.Services.AddAuthentication(options =>
            {
                // Google ve Identity'nin çakışmaması için varsayılan şemaları sabitliyoruz
                options.DefaultScheme = IdentityConstants.ApplicationScheme;
                options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
            })
                .AddGoogle(options =>
                {
                    options.ClientId = builder.Configuration["Authentication:Google:ClientId"];
                    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];

                    // ✅ BU SATIR 500 HATASINI ÇÖZER:
                    // Google'dan gelen geçici auth bilgisini Identity'nin External Cookie'sine yazar.
                    options.SignInScheme = IdentityConstants.ExternalScheme;

                    // Hata ayıklama kontrolü
                    if (string.IsNullOrEmpty(options.ClientId) || string.IsNullOrEmpty(options.ClientSecret))
                    {
                        throw new Exception("Google ClientId veya ClientSecret appsettings.json içinde bulunamadı!");
                    }
                })
                .AddMicrosoftAccount(microsoftOptions =>
                {
                    microsoftOptions.ClientId = builder.Configuration["Authentication:Microsoft:ClientId"];
                    microsoftOptions.ClientSecret = builder.Configuration["Authentication:Microsoft:ClientSecret"];
                    microsoftOptions.CallbackPath = "/signin-microsoft";
                    microsoftOptions.SignInScheme = IdentityConstants.ExternalScheme;
                });

            // --- 3.5 Rate Limiter (Yeni) ---
            // Global limiter partitioned by authenticated user id (or by IP for anonymous users).
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.OnRejected = async (context, ct) =>
                {
                    var response = context.HttpContext.Response;
                    response.ContentType = "application/json";
                    response.StatusCode = StatusCodes.Status429TooManyRequests;
                    var payload = JsonSerializer.Serialize(new { IsSuccess = false, Message = "Too many requests. Please try again later." });
                    await response.WriteAsync(payload, ct);
                };

                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                {
                    // Use authenticated user id as partition key, fallback to IP
                    var userId = httpContext.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                    var partitionKey = !string.IsNullOrEmpty(userId)
                        ? userId
                        : httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                    // Fixed window limiter: e.g., 60 requests per minute per partition
                    return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0 // no queuing
                    });
                });
            });

            // --- 4. Cookie Ayarları ---
            // Identity cookie ayarlarını gevşetiyoruz (Localhost ve Cross-site için)
            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.SameSite = SameSiteMode.Lax; // None yerine Lax genellikle daha stabildir
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.HttpOnly = true;
            });

            // CORS Ayarları
            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    policy.WithOrigins("https://localhost:4200", "http://localhost:4200")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            builder.Services.AddAuthorization();

            var app = builder.Build();

            // Seed Data
            await AIFriendSeed.SeedAsync(app.Services);

            // --- 5. Middleware Pipeline ---

            // Geliştirme ortamında detaylı hata sayfası (500 yerine gerçek hatayı görmek için)
            if (app.Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage(); // ✅ Eklendi
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Chat Application API v1");
                });
                app.MapOpenApi();
            }

            // Routing must be enabled before UseRateLimiter when using endpoint-specific limiters.
            app.UseRouting();

            // Apply CORS, HTTPS, static files, cookie policy etc.
            app.UseCors();
            app.UseHttpsRedirection();
            app.UseStaticFiles();

            // ✅ Cookie Policy: Authentication'dan ÖNCE olmalı
            app.UseCookiePolicy(new CookiePolicyOptions
            {
                MinimumSameSitePolicy = SameSiteMode.Lax,
                Secure = CookieSecurePolicy.Always
            });

            // Enable rate limiting middleware (global limiter configured above)
            app.UseRateLimiter();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseMiddleware<AIFriendMiddleware>();

            app.MapControllers();
            app.MapHub<ChatHub>("/chathub");

            // Identity API Endpoint'leri
            app.MapGroup("api").MapIdentityApi<ApplicationUser>();

            app.Run();
        }
    }
}