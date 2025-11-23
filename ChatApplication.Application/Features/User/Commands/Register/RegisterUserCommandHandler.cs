using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ChatApplication.Application.Features.User.Commands.Register
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

                // If no profile photo provided, use default URL path (ensure default.jpg exists at wwwroot/uploads/profiles/default.jpg)
                var profilePhotoUrl = string.IsNullOrWhiteSpace(request.ProfilePhotoUrl)
                    ? "/uploads/profiles/default.jpg"
                    : request.ProfilePhotoUrl;

                var newUser = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    Name = request.Name ?? string.Empty,
                    LastName = request.LastName ?? string.Empty,
                    ProfilePhotoUrl = profilePhotoUrl,
                    FriendCode = await GenerateUniqueFriendCodeAsync()
                };

                _logger.LogInformation("Creating user: {Email}, Name: {Name}, LastName: {LastName}",
                    newUser.Email, newUser.Name, newUser.LastName);

                var result = await _userManager.CreateAsync(newUser, request.Password);

                if (result.Succeeded)
                {
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

                _logger.LogError(ex, "Kullanıcı oluşturulırken beklenmeyen bir hata oluştu: {Message}", ex.Message);
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

        public async Task<string> GenerateUniqueFriendCodeAsync()
        {
            Random random = new Random();
            string friendCode;
            bool isUnique = false;

            do
            {
                friendCode = random.Next(10000, 100000).ToString();

                var existingUser = await _userManager.Users
                    .FirstOrDefaultAsync(u => u.FriendCode == friendCode);

                isUnique = existingUser == null;

            } while (!isUnique);

            return friendCode;
        }
    }
}