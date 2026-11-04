using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class JobApplicationCreateDto
    {
        [Required]
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
    }
}