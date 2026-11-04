
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs;

public class LeaveStatusDto
{
    [Required]
    [RegularExpression("^(Approved|Rejected)$",
        ErrorMessage = "Status must be Approved or Rejected.")]
    public string Status { get; set; } = string.Empty;
}
