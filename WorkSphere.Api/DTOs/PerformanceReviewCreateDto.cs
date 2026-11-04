
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class PerformanceReviewCreateDto
{
    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public int PerformanceReviewCycleId { get; set; }

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

    [MaxLength(2000)]
    public string? Strengths { get; set; }

    [MaxLength(2000)]
    public string? AreasForImprovement { get; set; }

    [MaxLength(2000)]
    public string? ManagerComments { get; set; }
}
