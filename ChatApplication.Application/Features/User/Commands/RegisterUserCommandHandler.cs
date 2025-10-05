using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Commands
{
    public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, RegisterUserCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<RegisterUserCommandHandler> _logger;

        public RegisterUserCommandHandler(UserManager<ApplicationUser> userManager, ILogger<RegisterUserCommandHandler> logger)
        {
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<RegisterUserCommandResponse> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Processing registration for email: {Email}, Name: {Name}", 
                    request?.Email ?? "null", request?.Name ?? "null");
                    
                if (request == null)
                {
                    _logger.LogError("Registration request object is null");
                    return new RegisterUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "İşlem sırasında bir hata oluştu.",
                        Errors = new List<string> { "Request data is null" }
                    };
                }

                var existingUser = await _userManager.FindByEmailAsync(request.Email);
                if (existingUser != null)
                {
                    _logger.LogWarning("Bu emaile {Email} sahip kullanıcı mevcut.", request.Email);
                    return new RegisterUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Bu email zaten kayıtlı."
                    };
                }

                var newUser = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    Name = request.Name ?? string.Empty,
                    LastName = request.LastName ?? string.Empty
                };

                _logger.LogInformation("Creating user: {Email}, Name: {Name}, LastName: {LastName}", 
                    newUser.Email, newUser.Name, newUser.LastName);

                var result = await _userManager.CreateAsync(newUser, request.Password);

                if(result.Succeeded)
                {
                    // Explicitly fetch the user again to ensure ID is populated
                    var createdUser = await _userManager.FindByEmailAsync(newUser.Email);
                    
                    _logger.LogInformation("User created successfully - ID: {Id}", createdUser?.Id ?? "null");
                    
                    return new RegisterUserCommandResponse
                    {
                        IsSuccess = true,
                        Message = "Kullanıcı başarıyla oluşturuldu.",
                        UserId = createdUser?.Id,
                        Email = createdUser?.Email
                    };
                }
                else
                {
                    _logger.LogError("Kullanıcı oluşturulamadı: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                    return new RegisterUserCommandResponse
                    {
                        IsSuccess = false,
                        Message = "Kullanıcı oluşturulamadı.",
                        Errors = result.Errors.Select(e => e.Description).ToList()
                    };
                }
            }
            catch (Exception ex)
            {

                _logger.LogError(ex, "Kullanıcı oluşturulurken beklenmeyen bir hata oluştu: {Message}", ex.Message);
                // Log inner exception if available
                if (ex.InnerException != null)
                {
                    _logger.LogError("Inner exception: {Message}", ex.InnerException.Message);
                }
                
                return new RegisterUserCommandResponse
                {
                    IsSuccess = false,
                    Message = "İşlem sırasında bir hata oluştu.",
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
