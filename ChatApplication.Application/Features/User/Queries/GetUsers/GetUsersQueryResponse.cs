namespace ChatApplication.Application.Features.User.Queries.GetUsers
{
    public class GetUsersQueryResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;

        public string FriendCode { get; set; } = string.Empty;
        public string? ProfilePhotoUrl { get; set; }
    }
}