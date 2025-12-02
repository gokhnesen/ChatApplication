namespace ChatApplication.Application.Features.User.Commands.UploadPhoto
{
    public class UploadProfilePhotoCommandResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? ProfilePhotoUrl { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }
}