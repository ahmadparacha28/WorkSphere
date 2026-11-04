using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class PayrollPaymentDto
{
    [Required]
    [MaxLength(50)]
    public string PaymentMethod { get; set; } = "Bank Transfer";
}