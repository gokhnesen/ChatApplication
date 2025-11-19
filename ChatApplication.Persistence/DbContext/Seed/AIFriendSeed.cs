using ChatApplication.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;


namespace ChatApplication.Persistence.DbContext.Seed
{
    public static class AIFriendSeed
    {
        private const string AiId = "ai-bot";

        public static async Task SeedAsync(IServiceProvider services)
        {
            if (services is null) throw new ArgumentNullException(nameof(services));

            using var scope = services.CreateScope();
            var provider = scope.ServiceProvider;

            try
            {
                var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();

                var aiUser = await userManager.FindByIdAsync(AiId);
                if (aiUser == null)
                {
                    var ai = new ApplicationUser
                    {
                        Id = AiId,
                        UserName = "Chat Bot",
                        Email = "ai-bot@local",
                        EmailConfirmed = true,
                        Name = "Chat",
                        LastName = "Bot",
                        FriendCode = Guid.NewGuid().ToString("N"),
                        ProfilePhotoUrl = "/uploads/profiles/AvatarAI.jpg"
                    };

                    var pw = Guid.NewGuid().ToString("N") + "Aa1!";
                    var result = await userManager.CreateAsync(ai, pw);

                    if (!result.Succeeded)
                    {
                        Console.WriteLine($"AIFriendSeed: failed to create AI user: {string.Join(", ", result.Errors)}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"AIFriendSeed: seeding failed: {ex.Message}");
            }
        }
    }
}
