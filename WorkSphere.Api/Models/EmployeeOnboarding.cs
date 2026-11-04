
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models
{
    public class EmployeeOnboarding
    {
        public int Id { get; set; }

        [Required]
        public int EmployeeId { get; set; }

        public Employee? Employee { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime StartDate { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "InProgress";

        public int ProgressPercentage { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<OnboardingTask> Tasks { get; set; }
            = new List<OnboardingTask>();
    }
}
