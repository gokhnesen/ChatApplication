using ChatApplication.Application.Exceptions;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

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
            _logger.LogInformation("Processing registration for email: {Email}, Name: {Name}",
                request?.Email ?? "null", request?.Name ?? "null");

            if (request == null)
            {
                _logger.LogError("Registration request object is null");
                throw new ValidationException(nameof(request), "Geçersiz istek.");
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                _logger.LogWarning("Bu emaile {Email} sahip kullanıcı mevcut.", request.Email);
                throw new BusinessException("EMAIL_ALREADY_REGISTERED", $"Email {request.Email} already registered.", "Bu email zaten kayıtlı.");
            }

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

            var errors = result.Errors.Select(e => e.Description).Where(d => !string.IsNullOrWhiteSpace(d)).ToList();
            _logger.LogError("Kullanıcı oluşturulamadı: {Errors}", string.Join(", ", errors));

            throw new BusinessException(
                "USER_CREATION_FAILED",
                string.Join("; ", errors),
                "Kullanıcı oluşturulamadı. Lütfen girdiğiniz bilgileri kontrol edin.");
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