using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class PayrollUpdateDto
{
    [Range(0, 999999999)]
    public decimal Allowances { get; set; }

    [Range(0, 999999999)]
    public decimal Bonus { get; set; }

    [Range(0, 999999999)]
    public decimal Overtime { get; set; }

    [Range(0, 999999999)]
    public decimal TaxDeduction { get; set; }

    [Range(0, 999999999)]
    public decimal OtherDeductions { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}