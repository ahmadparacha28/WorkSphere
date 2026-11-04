
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace WorkSphere.Api.DTOs
{
    public class JobApplicationUploadDto
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

        public IFormFile? ResumeFile { get; set; }

        public string? CoverLetter { get; set; }
    }
}
