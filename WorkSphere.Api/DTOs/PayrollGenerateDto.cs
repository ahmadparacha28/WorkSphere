using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class PayrollGenerateDto
{
    [Range(1, 12)]
    public int Month { get; set; }

    [Range(2000, 2100)]
    public int Year { get; set; }
}