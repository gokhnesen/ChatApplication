using FluentValidation;

namespace ChatApplication.Application.Features.Messages.Commands.SendMessage
{
    public class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
    {
        private const long MaxAttachmentSizeBytes = 50 * 1024 * 1024; // 50 MB
        public SendMessageCommandValidator()
        {
            RuleFor(x => x.SenderId)
                .NotEmpty().WithMessage("Gönderici Id zorunludur.");

            RuleFor(x => x.ReceiverId)
                .NotEmpty().WithMessage("Alıcı Id zorunludur.");

            When(x => x.Type == Domain.Entities.MessageType.Text, () =>
            {
                RuleFor(x => x.Content)
                    .NotEmpty().WithMessage("Mesaj içeriği boş olamaz.")
                    .MaximumLength(2000).WithMessage("Mesaj içeriği en fazla 2000 karakter olabilir.");
            });

            RuleFor(x => x.Content)
                .MaximumLength(2000).WithMessage("Mesaj içeriği en fazla 2000 karakter olabilir.")
                .When(x => !string.IsNullOrEmpty(x.Content));
        }
    }
}