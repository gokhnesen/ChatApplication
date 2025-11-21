using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Commands.UpdateUserProfile
{
    public class UpdateUserProfileCommandValidator : AbstractValidator<UpdateUserProfileCommand>
    {
        public UpdateUserProfileCommandValidator()
        {
            RuleFor(x => x.UserId)
                .NotEmpty().WithMessage("Kullanıcı ID boş olamaz.");
            When(x => !string.IsNullOrWhiteSpace(x.Name), () =>
            {
                RuleFor(x => x.Name)
                    .MaximumLength(100).WithMessage("İsim en fazla 100 karakter olabilir.");
            });
            When(x => !string.IsNullOrWhiteSpace(x.LastName), () =>
            {
                RuleFor(x => x.LastName)
                    .MaximumLength(100).WithMessage("Soyisim en fazla 100 karakter olabilir.");
            });
            When(x => !string.IsNullOrWhiteSpace(x.ProfilePhotoUrl), () =>
            {
                RuleFor(x => x.ProfilePhotoUrl)
                    .MaximumLength(2000).WithMessage("Profil fotoğrafı URL'si çok uzun.");
            });
        }
    }
}
