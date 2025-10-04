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
                    Name = request.Name,
                    LastName = request.LastName
                };

                var result = await _userManager.CreateAsync(newUser, request.Password);

                if(result.Succeeded)
                {
                    _logger.LogInformation("Yeni kullanıcı oluşturuldu: {Email}", newUser.Email);
                    var response = new RegisterUserCommandResponse
                    {
                        IsSuccess = true,
                        Message = "Kullanıcı başarıyla oluşturuldu.",
                        UserId = newUser.Id,
                        Email = newUser.Email
                    };
                    return response;
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

                _logger.LogError("Kullanıcı oluşturulurken beklenmeyen bir hata oluştu: {Message}", ex.Message);
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
