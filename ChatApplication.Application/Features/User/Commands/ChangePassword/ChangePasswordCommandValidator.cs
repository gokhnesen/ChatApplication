using FluentValidation;

namespace ChatApplication.Application.Features.User.Commands.ChangePassword
{
    public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
    {
        public ChangePasswordCommandValidator()
        {
            RuleFor(x => x.NewPassword)
                .NotEmpty().WithMessage("Yeni ?ifre zorunludur.")
                .MinimumLength(6).WithMessage("?ifre en az 6 karakter olmal?d?r.")
                .MaximumLength(100).WithMessage("?ifre en fazla 100 karakter olabilir.");

            RuleFor(x => x.ConfirmPassword)
                .Equal(x => x.NewPassword).When(x => !string.IsNullOrEmpty(x.ConfirmPassword))
                .WithMessage("Onay ?ifresi yeni ?ifre ile e?le?miyor.");

            RuleFor(x => x.UserId)
                .NotEmpty().WithMessage("Kullan?c? bilgisi bulunamad?.");
        }
    }
}