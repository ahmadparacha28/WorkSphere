
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class OnboardingTaskCreateDto
    {
        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(100)]
        public string AssignedTo { get; set; } = "HR";

        public DateTime? DueDate { get; set; }
    }
}
