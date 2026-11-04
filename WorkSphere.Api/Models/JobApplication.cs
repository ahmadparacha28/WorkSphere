using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models
{
    public class JobApplication
    {
        public int Id { get; set; }

        public int JobVacancyId { get; set; }

        [Required]
        [MaxLength(150)]
        public string CandidateName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? Phone { get; set; }

        public string? ResumeUrl { get; set; }

        public string? CoverLetter { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Applied";

        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

        public JobVacancy? JobVacancy { get; set; }

        public ICollection<JobInterview> Interviews { get; set; }
            = new List<JobInterview>();
    }
}