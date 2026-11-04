
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models
{
    public class OffboardingTask
    {
        public int Id { get; set; }

        [Required]
        public int EmployeeOffboardingId { get; set; }

        public EmployeeOffboarding? EmployeeOffboarding { get; set; }

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(100)]
        public string AssignedTo { get; set; } = "HR";

        [MaxLength(30)]
        public string Status { get; set; } = "Pending";

        public DateTime? DueDate { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
