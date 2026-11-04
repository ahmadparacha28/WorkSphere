using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class EmployeeDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Phone]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public string Position { get; set; } = string.Empty;

    [Range(0, 100000000)]
    public decimal Salary { get; set; }

    public DateTime HireDate { get; set; }

    [Range(1, int.MaxValue)]
    public int DepartmentId { get; set; }
}