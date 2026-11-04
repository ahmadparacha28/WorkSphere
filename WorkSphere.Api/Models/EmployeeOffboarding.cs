
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models
{
    public class EmployeeOffboarding
    {
        public int Id { get; set; }

        [Required]
        public int EmployeeId { get; set; }

        public Employee? Employee { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        public DateTime ResignationDate { get; set; }

        public DateTime LastWorkingDate { get; set; }

        public DateTime? CompletedAt { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "InProgress";

        [MaxLength(1000)]
        public string? ExitInterviewNotes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<OffboardingTask> Tasks { get; set; }
            = new List<OffboardingTask>();
    }
}
