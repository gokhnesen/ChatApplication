using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Domain.Entities
{
    public class Friend : BaseEntity
    {
        public string SenderId { get; set; }

        [ForeignKey("SenderId")]
        public ApplicationUser Sender { get; set; }

        public string ReceiverId { get; set; } = string.Empty;

        [ForeignKey("ReceiverId")]
        public ApplicationUser Receiver { get; set; }

        public FriendStatus Status { get; set; } = FriendStatus.Beklemede;
        public DateTime RequestDate { get; set; } = DateTime.UtcNow;
        public DateTime? AcceptedDate { get; set; }


    }
    public enum FriendStatus
    {
        Beklemede,
        Onaylandi,
        Rededildi,
        Engellendi
    }
}
