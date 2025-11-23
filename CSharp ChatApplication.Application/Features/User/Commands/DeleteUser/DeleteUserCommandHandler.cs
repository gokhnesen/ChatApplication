using ChatApplication.Domain.Entities;
using ChatApplication.Persistence.DbContext;
using ChatApplication.Application.Interfaces.Message;
using ChatApplication.Application.Interfaces.Friend;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ChatApplication.Application.Features.User.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, DeleteUserCommandResponse>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ChatAppDbContext _dbContext;
        private readonly IMessageReadRepository _messageReadRepository;
        private readonly IMessageWriteRepository _messageWriteRepository;
        private readonly IFriendReadRepository _friendReadRepository;
        private readonly IFriendWriteRepository _friendWriteRepository;
        private readonly ILogger<DeleteUserCommandHandler> _logger;

        public DeleteUserCommandHandler(
            UserManager<ApplicationUser> userManager,
            ChatAppDbContext dbContext,
            IMessageReadRepository messageReadRepository,
            IMessageWriteRepository messageWriteRepository,
            IFriendReadRepository friendReadRepository,
            IFriendWriteRepository friendWriteRepository,
            ILogger<DeleteUserCommandHandler> logger)
        {
            _userManager = userManager;
            _dbContext = dbContext;
            _messageReadRepository = messageReadRepository;
            _messageWriteRepository = messageWriteRepository;
            _friendReadRepository = friendReadRepository;
            _friendWriteRepository = friendWriteRepository;
            _logger = logger;
        }

        public async Task<DeleteUserCommandResponse> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.UserId))
                {
                    return new DeleteUserCommandResponse { IsSuccess = false, Message = "Geçersiz istek." };
                }

                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return new DeleteUserCommandResponse { IsSuccess = false, Message = "Kullan?c? bulunamad?." };
                }

                // E?er kullan?c? lokal ?ifreye sahipse mevcut ?ifre do?rulans?n
                var hasPassword = await _userManager.HasPasswordAsync(user);
                if (hasPassword)
                {
                    if (string.IsNullOrEmpty(request.CurrentPassword))
                    {
                        return new DeleteUserCommandResponse { IsSuccess = false, Message = "Mevcut ?ifre gereklidir." };
                    }

                    var pwdValid = await _userManager.CheckPasswordAsync(user, request.CurrentPassword);
                    if (!pwdValid)
                    {
                        return new DeleteUserCommandResponse { IsSuccess = false, Message = "Mevcut ?ifre yanl??." };
                    }
                }

                // Transaction: önce ili?kili verileri repository ile temizle, sonra Identity user sil
                await using (var tx = await _dbContext.Database.BeginTransactionAsync(cancellationToken))
                {
                    // Mesajlar? sorgula ve sil
                    var messages = await _messageReadRepository
                        .GetAll(tracking: false)
                        .Where(m => m.SenderId == request.UserId || m.ReceiverId == request.UserId)
                        .ToListAsync(cancellationToken);

                    foreach (var msg in messages)
                    {
                        _messageWriteRepository.Remove(msg);
                    }

                    // Arkada?l?k kay?tlar?n? sorgula ve sil
                    var friends = await _friendReadRepository
                        .GetAll(tracking: false)
                        .Where(f => f.SenderId == request.UserId || f.ReceiverId == request.UserId)
                        .ToListAsync(cancellationToken);

                    foreach (var fr in friends)
                    {
                        _friendWriteRepository.Remove(fr);
                    }

                    // De?i?iklikleri kaydet
                    await _dbContext.SaveChangesAsync(cancellationToken);

                    // Identity user'? sil
                    var deleteResult = await _userManager.DeleteAsync(user);

                    if (!deleteResult.Succeeded)
                    {
                        var errs = deleteResult.Errors.Select(e => e.Description).ToList();
                        _logger.LogWarning("Kullan?c? silme ba?ar?s?z: {UserId} - {Errors}", request.UserId, string.Join(", ", errs));
                        await tx.RollbackAsync(cancellationToken);
                        return new DeleteUserCommandResponse { IsSuccess = false, Message = "Kullan?c? silinemedi.", Errors = errs };
                    }

                    await tx.CommitAsync(cancellationToken);
                }

                _logger.LogInformation("Kullan?c? silindi: {UserId}", request.UserId);
                return new DeleteUserCommandResponse { IsSuccess = true, Message = "Hesab?n?z ba?ar?yla silindi." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kullan?c? silinirken hata: {UserId}", request?.UserId);
                return new DeleteUserCommandResponse { IsSuccess = false, Message = "Sunucu hatas? olu?tu.", Errors = new List<string> { ex.Message } };
            }
        }
    }
}