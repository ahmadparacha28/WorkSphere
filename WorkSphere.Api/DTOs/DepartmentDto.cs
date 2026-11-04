using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class DepartmentDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
}