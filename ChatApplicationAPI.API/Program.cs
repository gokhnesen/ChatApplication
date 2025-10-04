using ChatApplication.Application;
using ChatApplication.Application.SignalR;
using ChatApplication.Domain.Entities;
using ChatApplication.Persistence;
using ChatApplication.Persistence.DbContext;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi.Models;
using System.Reflection;

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
            });
            builder.Services.AddOpenApi();
            builder.Services.AddApplicationServices();
            builder.Services.AddPersistenceServices(builder.Configuration);
            builder.Services.AddSignalR();
            builder.Services.AddAuthorization();
            builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<ChatAppDbContext>();

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

            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.MapControllers();
            app.MapHub<ChatHub>("/chathub");
            app.MapGroup("api").MapIdentityApi<ApplicationUser>();

            app.Run();
        }
    }
}
