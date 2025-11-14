using ChatApplication.Application;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using ChatApplication.Persistence;
using ChatApplication.Persistence.DbContext;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text;


namespace ChatApplicationAPI.API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
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

            // ✅ Data Protection - TEK SEFER EKLE
            builder.Services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(Directory.GetCurrentDirectory(), "keys")))
                .SetApplicationName("ChatApplication");

            // ✅ Identity
            builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<ChatAppDbContext>();

            // ✅ Authentication - Google ve Microsoft
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultScheme = IdentityConstants.ApplicationScheme;
                options.DefaultSignInScheme = IdentityConstants.ExternalScheme;

            })
.AddGoogle(googleOptions =>
{
    googleOptions.ClientId = builder.Configuration["Authentication:Google:ClientId"];
    googleOptions.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
    googleOptions.CallbackPath = "/api/User/google-callback"; // ✅ Değişti
    googleOptions.SaveTokens = true;
    googleOptions.CorrelationCookie.SameSite = SameSiteMode.None;
    googleOptions.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
})
.AddMicrosoftAccount(microsoftOptions =>
{
    microsoftOptions.ClientId = builder.Configuration["Authentication:Microsoft:ClientId"];
    microsoftOptions.ClientSecret = builder.Configuration["Authentication:Microsoft:ClientSecret"];
    microsoftOptions.CallbackPath = "/api/User/microsoft-callback"; // ✅ Değişti
    microsoftOptions.SaveTokens = true;
    microsoftOptions.CorrelationCookie.SameSite = SameSiteMode.None;
    microsoftOptions.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
});

            // ✅ Cookie yapılandırması
            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.SameSite = SameSiteMode.None; // ✅ Cross-origin için None
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
            });

            // ✅ External authentication cookie ayarları
            builder.Services.Configure<CookieAuthenticationOptions>(
                IdentityConstants.ExternalScheme,
                options =>
                {
                    options.Cookie.SameSite = SameSiteMode.None; // ✅ Cross-origin için None
                    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                    options.Cookie.HttpOnly = true;
                    options.Cookie.IsEssential = true;
                });

            // ✅ CORS
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

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Chat Application API v1");
                });
                app.MapOpenApi();
            }

            // ✅ CORS önce gelmeli
            app.UseCors();

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            // ✅ Authentication ve Authorization
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<ChatHub>("/chathub");
            app.MapGroup("api").MapIdentityApi<ApplicationUser>();

            app.Run();
        }
    }
}