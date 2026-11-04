using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models
{
    public class JobInterview
    {
        public int Id { get; set; }

        public int JobApplicationId { get; set; }

        public DateTime ScheduledAt { get; set; }

        [MaxLength(100)]
        public string InterviewType { get; set; } = "Technical";

        [MaxLength(150)]
        public string InterviewerName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Location { get; set; }

        public string? Notes { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Scheduled";

        public JobApplication? JobApplication { get; set; }
    }
}