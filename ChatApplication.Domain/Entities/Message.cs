using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Domain.Entities
{
    public class Message : BaseEntity
    {
        public string SenderId { get; set; }

        public string ReceiverId { get; set; }

        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public bool IsRead { get; set; } = false;

        public MessageType Type { get; set; } = MessageType.Text;

        public string? AttachmentUrl { get; set; }

        public string? AttachmentName { get; set; }

        public long? AttachmentSize { get; set; }

        public ApplicationUser Sender { get; set; }

        public ApplicationUser Receiver { get; set; }
    }

    public enum MessageType
    {
        Text = 0,
        Image = 1,
        File = 2,
        Video =3
    }
}
