
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class OnboardingCreateDto
    {
        [Required]
        public int EmployeeId { get; set; }

        public DateTime StartDate { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
