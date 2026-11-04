
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class OffboardingCreateDto
    {
        [Required]
        public int EmployeeId { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        public DateTime ResignationDate { get; set; }

        public DateTime LastWorkingDate { get; set; }

        [MaxLength(1000)]
        public string? ExitInterviewNotes { get; set; }
    }
}
