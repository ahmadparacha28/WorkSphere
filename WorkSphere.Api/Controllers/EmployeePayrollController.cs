
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Employee")]
public class EmployeePayrollController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeePayrollController(AppDbContext context)
    {
        _context = context;
    }

    private bool TryGetEmployeeId(out int employeeId)
    {
        var employeeIdValue =
            User.FindFirst("EmployeeId")?.Value ??
            User.FindFirst("employeeId")?.Value;

        return int.TryParse(employeeIdValue, out employeeId);
    }

    // GET: api/EmployeePayroll
    [HttpGet]
    public async Task<IActionResult> GetMyPayroll()
    {
        if (!TryGetEmployeeId(out var employeeId))
        {
            return BadRequest(new
            {
                message = "Your account is not linked to an employee record."
            });
        }

        var payrollRecords = await _context.Payrolls
            .Where(p => p.EmployeeId == employeeId)
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .Select(p => new
            {
                p.Id,
                p.Month,
                p.Year,
                p.BasicSalary,
                p.Allowances,
                p.Bonus,
                p.Overtime,
                p.GrossSalary,
                p.TaxDeduction,
                p.OtherDeductions,
                p.TotalDeductions,
                p.NetSalary,
                p.Status,
                p.PaymentMethod,
                p.PaidAt,
                p.Notes,
                p.CreatedAt
            })
            .ToListAsync();

        return Ok(payrollRecords);
    }

    // GET: api/EmployeePayroll/{id}/payslip
    [HttpGet("{id}/payslip")]
    public async Task<IActionResult> GetMyPayslip(int id)
    {
        if (!TryGetEmployeeId(out var employeeId))
        {
            return BadRequest(new
            {
                message = "Your account is not linked to an employee record."
            });
        }

        var payslip = await _context.Payrolls
            .Where(p => p.Id == id && p.EmployeeId == employeeId)
            .Select(p => new
            {
                p.Id,
                p.Month,
                p.Year,
                p.BasicSalary,
                p.Allowances,
                p.Bonus,
                p.Overtime,
                p.GrossSalary,
                p.TaxDeduction,
                p.OtherDeductions,
                p.TotalDeductions,
                p.NetSalary,
                p.Status,
                p.PaymentMethod,
                p.PaidAt,
                p.Notes,
                EmployeeName = p.Employee != null
                    ? p.Employee.FirstName + " " + p.Employee.LastName
                    : "Employee",
                EmployeeEmail = p.Employee != null
                    ? p.Employee.Email
                    : "",
                Position = p.Employee != null
                    ? p.Employee.Position
                    : "",
                Department = p.Employee != null &&
                             p.Employee.Department != null
                    ? p.Employee.Department.Name
                    : "Not Assigned"
            })
            .FirstOrDefaultAsync();

        if (payslip == null)
        {
            return NotFound(new
            {
                message = "Payslip not found."
            });
        }

        return Ok(payslip);
    }
}
