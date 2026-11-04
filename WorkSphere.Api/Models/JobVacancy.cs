using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models
{
    public class JobVacancy
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Department { get; set; } = string.Empty;

        [MaxLength(50)]
        public string EmploymentType { get; set; } = "Full-Time";

        [MaxLength(150)]
        public string Location { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? SalaryRange { get; set; }

        public string? Requirements { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Open";

        public DateTime PostedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ClosingDate { get; set; }

        public ICollection<JobApplication> Applications { get; set; }
            = new List<JobApplication>();
    }
}