using ChatApplication.Application.Interfaces;
using ChatApplication.Application.Interfaces.Friend;
using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Persistence.DbContext;
using ChatApplication.Persistence.Repositories;
using ChatApplication.Persistence.Repositories.Friend;
using ChatApplication.Persistence.Repositories.Message;
using ChatApplication.Persistence.Repositories.Messages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Persistence
{
    public static class PersistenceServiceRegistration
    {
        public static IServiceCollection AddPersistenceServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<ChatAppDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

            services.AddScoped<IMessageReadRepository, MessageReadRepository>();
            services.AddScoped<IMessageWriteRepository, MessageWriteRepository>();
            services.AddScoped<IFriendReadRepository, FriendReadRepository>();
            services.AddScoped<IFriendWriteRepository, FriendWriteRepository>();

            services.AddScoped(typeof(IReadRepository<>), typeof(ReadRepository<>));
            services.AddScoped(typeof(IWriteRepository<>), typeof(WriteRepository<>));
            return services;
        }
    }
}
