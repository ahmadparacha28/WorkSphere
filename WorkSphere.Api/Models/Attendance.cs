using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models;

public class Attendance
{
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    public DateTime Date { get; set; } = DateTime.Today;

    public DateTime? CheckIn { get; set; }

    public DateTime? CheckOut { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Present";

    [MaxLength(300)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}