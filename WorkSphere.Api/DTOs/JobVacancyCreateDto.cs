using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class JobVacancyCreateDto
    {
        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Department { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string EmploymentType { get; set; } = "Full-Time";

        [MaxLength(150)]
        public string Location { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? SalaryRange { get; set; }

        public string? Requirements { get; set; }

        public DateTime? ClosingDate { get; set; }
    }
}