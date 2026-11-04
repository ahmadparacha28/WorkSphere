
using Microsoft.AspNetCore.Identity;

namespace WorkSphere.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;

    public int? EmployeeId { get; set; }
}
