
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class LeaveRequestDto
{
    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public string LeaveType { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [Required]
    [StringLength(500)]
    public string Reason { get; set; } = string.Empty;
}
