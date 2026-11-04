
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models;

public class PerformanceReview
{
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public int PerformanceReviewCycleId { get; set; }

    // Manager or HR user who conducted the review
    [MaxLength(450)]
    public string? ReviewerUserId { get; set; }

    [Range(1, 5)]
    public int WorkQualityRating { get; set; }

    [Range(1, 5)]
    public int ProductivityRating { get; set; }

    [Range(1, 5)]
    public int CommunicationRating { get; set; }

    [Range(1, 5)]
    public int TeamworkRating { get; set; }

    [Range(1, 5)]
    public int PunctualityRating { get; set; }

    public decimal OverallRating { get; set; }

    [MaxLength(2000)]
    public string? Strengths { get; set; }

    [MaxLength(2000)]
    public string? AreasForImprovement { get; set; }

    [MaxLength(2000)]
    public string? ManagerComments { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Draft";

    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }

    public PerformanceReviewCycle? PerformanceReviewCycle { get; set; }
}
