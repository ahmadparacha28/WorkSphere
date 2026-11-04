
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models;

public class PerformanceReviewCycle
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PerformanceReview> Reviews { get; set; }
        = new List<PerformanceReview>();
}
