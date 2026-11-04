using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class JobInterviewUpdateDto
    {
        [Required]
        public DateTime ScheduledAt { get; set; }

        [Required]
        [MaxLength(100)]
        public string InterviewType { get; set; } = "Technical";

        [Required]
        [MaxLength(150)]
        public string InterviewerName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Location { get; set; }

        public string? Notes { get; set; }
    }
}