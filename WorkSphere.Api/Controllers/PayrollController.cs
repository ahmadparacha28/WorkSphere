using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,HR")]
public class PayrollController : ControllerBase
{
    private readonly AppDbContext _context;

    public PayrollController(AppDbContext context)
    {
        _context = context;
    }

    private static decimal Money(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static void Calculate(Payroll payroll)
    {
        payroll.GrossSalary = Money(
            payroll.BasicSalary +
            payroll.Allowances +
            payroll.Bonus +
            payroll.Overtime
        );

        payroll.TotalDeductions = Money(
            payroll.TaxDeduction +
            payroll.OtherDeductions
        );

        payroll.NetSalary = Money(
            payroll.GrossSalary - payroll.TotalDeductions
        );

        payroll.UpdatedAt = DateTime.UtcNow;
    }

    private static bool HasNegativeAmounts(PayrollUpdateDto dto)
    {
        return dto.Allowances < 0 ||
               dto.Bonus < 0 ||
               dto.Overtime < 0 ||
               dto.TaxDeduction < 0 ||
               dto.OtherDeductions < 0;
    }

    private static object ToPayrollResponse(Payroll p)
    {
        return new
        {
            p.Id,
            p.EmployeeId,
            employeeName = p.Employee == null
                ? "Unknown"
                : $"{p.Employee.FirstName} {p.Employee.LastName}",
            employeeEmail = p.Employee?.Email,
            departmentName = p.Employee?.Department?.Name ?? "Unassigned",
            position = p.Employee?.Position,
            p.Month,
            p.Year,
            p.BasicSalary,
            p.Allowances,
            p.Bonus,
            p.Overtime,
            p.TaxDeduction,
            p.OtherDeductions,
            p.GrossSalary,
            p.TotalDeductions,
            p.NetSalary,
            p.Status,
            p.PaymentMethod,
            p.PaidAt,
            p.Notes,
            p.CreatedAt,
            p.UpdatedAt
        };
    }

    // GET: api/Payroll
    [HttpGet]
    public async Task<IActionResult> GetPayroll(
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] int? employeeId,
        [FromQuery] string? status)
    {
        if (month.HasValue && (month < 1 || month > 12))
            return BadRequest(new { message = "Invalid month." });

        if (year.HasValue && (year < 2000 || year > 2100))
            return BadRequest(new { message = "Invalid year." });

        var query = _context.Payrolls
            .Include(p => p.Employee)
            .ThenInclude(e => e!.Department)
            .AsQueryable();

        if (month.HasValue)
            query = query.Where(p => p.Month == month.Value);

        if (year.HasValue)
            query = query.Where(p => p.Year == year.Value);

        if (employeeId.HasValue)
            query = query.Where(p => p.EmployeeId == employeeId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        var records = await query
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .ThenBy(p => p.Employee!.FirstName)
            .ToListAsync();

        return Ok(records.Select(ToPayrollResponse));
    }

    // GET: api/Payroll/summary?month=11&year=2026
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        if (month < 1 || month > 12 || year < 2000 || year > 2100)
            return BadRequest(new { message = "Invalid month or year." });

        var records = await _context.Payrolls
            .Where(p => p.Month == month && p.Year == year)
            .ToListAsync();

        return Ok(new
        {
            month,
            year,
            totalEmployees = records.Count,
            paidEmployees = records.Count(p => p.Status == "Paid"),
            pendingEmployees = records.Count(p => p.Status == "Pending"),
            grossPayroll = records.Sum(p => p.GrossSalary),
            totalDeductions = records.Sum(p => p.TotalDeductions),
            netPayroll = records.Sum(p => p.NetSalary),
            paidAmount = records
                .Where(p => p.Status == "Paid")
                .Sum(p => p.NetSalary),
            pendingAmount = records
                .Where(p => p.Status == "Pending")
                .Sum(p => p.NetSalary)
        });
    }

    // POST: api/Payroll/generate
    [HttpPost("generate")]
    public async Task<IActionResult> GeneratePayroll(
        PayrollGenerateDto dto)
    {
        if (dto.Month < 1 || dto.Month > 12 ||
            dto.Year < 2000 || dto.Year > 2100)
        {
            return BadRequest(new { message = "Invalid month or year." });
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var employees = await _context.Employees
            .OrderBy(e => e.FirstName)
            .ToListAsync();

        if (employees.Count == 0)
            return BadRequest(new { message = "No employees found." });

        var existingIds = await _context.Payrolls
            .Where(p => p.Month == dto.Month && p.Year == dto.Year)
            .Select(p => p.EmployeeId)
            .ToListAsync();

        var existingSet = existingIds.ToHashSet();

        var newRecords = new List<Payroll>();

        foreach (var employee in employees)
        {
            if (existingSet.Contains(employee.Id))
                continue;

            if (employee.Salary < 0)
                continue;

            var payroll = new Payroll
            {
                EmployeeId = employee.Id,
                Month = dto.Month,
                Year = dto.Year,
                BasicSalary = Money(employee.Salary),
                Allowances = 0,
                Bonus = 0,
                Overtime = 0,
                TaxDeduction = 0,
                OtherDeductions = 0,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            Calculate(payroll);
            newRecords.Add(payroll);
        }

        if (newRecords.Count > 0)
        {
            await _context.Payrolls.AddRangeAsync(newRecords);
            await _context.SaveChangesAsync();
        }

        await transaction.CommitAsync();

        return Ok(new
        {
            message = newRecords.Count > 0
                ? "Payroll generated successfully."
                : "Payroll records already exist for all employees.",
            generatedCount = newRecords.Count,
            skippedCount = employees.Count - newRecords.Count,
            month = dto.Month,
            year = dto.Year
        });
    }

    // PUT: api/Payroll/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdatePayroll(
        int id,
        PayrollUpdateDto dto)
    {
        var payroll = await _context.Payrolls
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payroll == null)
            return NotFound(new { message = "Payroll record not found." });

        if (payroll.Status == "Paid")
        {
            return BadRequest(new
            {
                message = "Paid payroll records cannot be edited."
            });
        }

        if (HasNegativeAmounts(dto))
        {
            return BadRequest(new
            {
                message = "Payroll amounts cannot be negative."
            });
        }

        payroll.Allowances = Money(dto.Allowances);
        payroll.Bonus = Money(dto.Bonus);
        payroll.Overtime = Money(dto.Overtime);
        payroll.TaxDeduction = Money(dto.TaxDeduction);
        payroll.OtherDeductions = Money(dto.OtherDeductions);
        payroll.Notes = dto.Notes?.Trim();

        Calculate(payroll);

        if (payroll.TotalDeductions > payroll.GrossSalary)
        {
            return BadRequest(new
            {
                message = "Total deductions cannot exceed gross salary."
            });
        }

        await _context.SaveChangesAsync();

        var updated = await _context.Payrolls
            .Include(p => p.Employee)
            .ThenInclude(e => e!.Department)
            .FirstAsync(p => p.Id == id);

        return Ok(new
        {
            message = "Payroll updated successfully.",
            payroll = ToPayrollResponse(updated)
        });
    }

    // PATCH: api/Payroll/5/pay
    [HttpPatch("{id:int}/pay")]
    public async Task<IActionResult> MarkAsPaid(
        int id,
        PayrollPaymentDto dto)
    {
        var payroll = await _context.Payrolls
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payroll == null)
            return NotFound(new { message = "Payroll record not found." });

        if (payroll.Status == "Paid")
            return BadRequest(new { message = "This payroll is already paid." });

        if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
            return BadRequest(new { message = "Payment method is required." });

        payroll.Status = "Paid";
        payroll.PaymentMethod = dto.PaymentMethod.Trim();
        payroll.PaidAt = DateTime.UtcNow;
        payroll.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Salary marked as paid successfully.",
            payrollId = payroll.Id,
            payroll.Status,
            payroll.PaymentMethod,
            payroll.PaidAt
        });
    }

    // GET: api/Payroll/5/payslip
    [HttpGet("{id:int}/payslip")]
    public async Task<IActionResult> GetPayslip(int id)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Employee)
            .ThenInclude(e => e!.Department)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payroll == null)
            return NotFound(new { message = "Payslip not found." });

        return Ok(ToPayrollResponse(payroll));
    }
}