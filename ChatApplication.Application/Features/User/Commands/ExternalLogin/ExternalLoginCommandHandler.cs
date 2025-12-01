using ChatApplication.Application.Exceptions;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Commands.ExternalLogin
{
    public class ExternalLoginCommandHandler : IRequestHandler<ExternalLoginCommand, ExternalLoginCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public ExternalLoginCommandHandler(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }
        public async Task<ExternalLoginCommandResponse> Handle(ExternalLoginCommand request, CancellationToken cancellationToken)
        {
            if (request.RemoteError != null)
            {
                throw new BusinessException("EXTERNAL_PROVIDER_ERROR", $"Harici sağlayıcı hatası: {request.RemoteError}");
            }

            var info = await _signInManager.GetExternalLoginInfoAsync();
            if (info == null)
            {
                throw new BusinessException("EXTERNAL_LOGIN_INFO_NULL", "Harici giriş bilgisi yüklenemedi.");
            }

            var signInResult = await _signInManager.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, isPersistent: true, bypassTwoFactor: true);

            if (signInResult.Succeeded)
            {
                return new ExternalLoginCommandResponse
                {
                    RedirectUrl = "https://localhost:4200/login?externalAuth=true"
                };
            }

            if (signInResult.IsLockedOut)
            {
                throw new BusinessException("ACCOUNT_LOCKED", "Hesap kilitli.");
            }

            var email = info.Principal.FindFirstValue(ClaimTypes.Email);
            var name = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? "User";
            var surname = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? "";

            if (string.IsNullOrEmpty(email))
            {
                throw new BusinessException("EMAIL_MISSING", "Email bilgisi alınamadı.");
            }

            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    Name = name,
                    LastName = surname,
                    FriendCode = GenerateFriendCode(),
                    ProfilePhotoUrl = "/uploads/profiles/default.jpg",
                    EmailConfirmed = true
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = createResult.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
                    throw new ValidationException(errors);
                }
            }

            var addLoginResult = await _userManager.AddLoginAsync(user, info);
            if (!addLoginResult.Succeeded)
            {
                throw new BusinessException("LOGIN_ADD_FAILED", "Google hesabı sisteme eklenemedi.");
            }

            await _signInManager.SignInAsync(user, isPersistent: true);

            return new ExternalLoginCommandResponse
            {
                RedirectUrl = "https://localhost:4200/login?externalAuth=true"
            };
        }

        private string GenerateFriendCode()
        {
            return Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
        }
    }
    }

