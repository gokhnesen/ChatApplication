using ChatApplication.Application;
using ChatApplication.Application.Middleware;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using ChatApplication.Persistence;
using ChatApplication.Persistence.DbContext;
using ChatApplication.Persistence.DbContext.Seed;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi.Models;

namespace ChatApplicationAPI.API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();

            builder.Services.AddHttpContextAccessor();

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

            builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<ChatAppDbContext>();

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultScheme = IdentityConstants.ApplicationScheme;
                options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
            })
                .AddGoogle(options =>
                {
                    options.ClientId = builder.Configuration["Authentication:Google:ClientId"];
                    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
                    options.SignInScheme = IdentityConstants.ExternalScheme;

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


            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.HttpOnly = true;
            });

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

            await AIFriendSeed.SeedAsync(app.Services);

            if (app.Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Chat Application API v1");
                });
                app.MapOpenApi();
            }

            app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

            app.UseRouting();

            app.UseCors();
            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseCookiePolicy(new CookiePolicyOptions
            {
                MinimumSameSitePolicy = SameSiteMode.Lax,
                Secure = CookieSecurePolicy.Always
            });

            app.UseMiddleware<RateLimitMiddleware>();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseMiddleware<AIFriendMiddleware>();

            app.MapControllers();
            app.MapHub<ChatHub>("/chathub");

            app.MapGroup("api").MapIdentityApi<ApplicationUser>();

            app.Run();
        }
    }
}