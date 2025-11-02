using Microsoft.AspNetCore.Identity;

namespace ChatApplication.Domain.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public string Name { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FriendCode { get; set; }
        public string? ProfilePhotoUrl { get; set; }
    }
}
