using ChatApplication.Application.Exceptions;
using ChatApplication.Application.Features.User.Queries.GetUserInfo;
using ChatApplication.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using System.Threading;
using System.Threading.Tasks;

public class GetUserInfoQueryHandler : IRequestHandler<GetUserInfoQuery, GetUserInfoQueryResponse>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GetUserInfoQueryHandler(UserManager<ApplicationUser> userManager, IHttpContextAccessor httpContextAccessor)
    {
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<GetUserInfoQueryResponse> Handle(GetUserInfoQuery request, CancellationToken cancellationToken)
    {
        var userPrincipal = _httpContextAccessor.HttpContext?.User;

        if (userPrincipal == null)
            throw new UnauthorizedException();

        var user = await _userManager.GetUserAsync(userPrincipal);

        if (user == null)
            throw new NotFoundException(nameof(ApplicationUser), userPrincipal.Identity?.Name ?? "current");

        return new GetUserInfoQueryResponse
        {
            Id = user.Id,
            Name = user.Name,
            UserName = user.UserName,
            LastName = user.LastName,
            Email = user.Email,
            ProfilePhotoUrl = user.ProfilePhotoUrl,
            FriendCode = user.FriendCode
        };
    }
}