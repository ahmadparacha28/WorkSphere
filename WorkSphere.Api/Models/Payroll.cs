using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.Models;

public class Payroll
{
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Required]
    [Range(1, 12)]
    public int Month { get; set; }

    [Required]
    [Range(2000, 2100)]
    public int Year { get; set; }

    public decimal BasicSalary { get; set; }

    public decimal Allowances { get; set; }

    public decimal Bonus { get; set; }

    public decimal Overtime { get; set; }

    public decimal TaxDeduction { get; set; }

    public decimal OtherDeductions { get; set; }

    public decimal GrossSalary { get; set; }

    public decimal TotalDeductions { get; set; }

    public decimal NetSalary { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    [MaxLength(50)]
    public string? PaymentMethod { get; set; }

    public DateTime? PaidAt { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}