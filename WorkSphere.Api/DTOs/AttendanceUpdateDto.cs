using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class AttendanceUpdateDto
{
    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public DateTime Date { get; set; }

    public DateTime? CheckIn { get; set; }

    public DateTime? CheckOut { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Present";

    [MaxLength(300)]
    public string? Notes { get; set; }
}