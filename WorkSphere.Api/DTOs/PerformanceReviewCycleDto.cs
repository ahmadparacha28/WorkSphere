
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class PerformanceReviewCycleDto
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }
}
