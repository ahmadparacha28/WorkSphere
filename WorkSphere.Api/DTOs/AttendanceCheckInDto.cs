using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class AttendanceCheckInDto
{
    [MaxLength(300)]
    public string? Notes { get; set; }
}