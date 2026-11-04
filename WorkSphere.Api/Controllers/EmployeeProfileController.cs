
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeeProfileController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeeProfileController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var employeeIdValue =
            User.FindFirst("EmployeeId")?.Value ??
            User.FindFirst("employeeId")?.Value;

        if (!int.TryParse(employeeIdValue, out var employeeId))
        {
            return BadRequest(new
            {
                message = "Your account is not linked to an employee record."
            });
        }

        var employee = await _context.Employees
            .Include(e => e.Department)
            .Where(e => e.Id == employeeId)
            .Select(e => new
            {
                e.Id,
                e.FirstName,
                e.LastName,
                FullName = e.FirstName + " " + e.LastName,
                e.Email,
                e.Phone,
                e.Position,
                e.HireDate,
                DepartmentName = e.Department != null
                    ? e.Department.Name
                    : "Not Assigned"
            })
            .FirstOrDefaultAsync();

        if (employee == null)
        {
            return NotFound(new
            {
                message = "Employee profile not found."
            });
        }

        return Ok(employee);
    }
}
