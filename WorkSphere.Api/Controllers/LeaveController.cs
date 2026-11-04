
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;
using WorkSphere.Api.Services;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeaveController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly NotificationService _notificationService;

    public LeaveController(
        AppDbContext context,
        NotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    private bool IsManager =>
        User.IsInRole("Admin") || User.IsInRole("HR");

    private int? CurrentEmployeeId
    {
        get
        {
            var claim = User.FindFirst("EmployeeId");
            return int.TryParse(claim?.Value, out int id) ? id : null;
        }
    }

    // GET: api/Leave
    [HttpGet]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> GetAllLeaves()
    {
        var leaves = await _context.LeaveRequests
            .Select(l => new
            {
                l.Id,
                l.EmployeeId,
                EmployeeName = l.Employee != null
                    ? l.Employee.FirstName + " " + l.Employee.LastName
                    : "Unknown",
                l.LeaveType,
                l.StartDate,
                l.EndDate,
                l.Reason,
                l.Status,
                l.CreatedAt
            })
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return Ok(leaves);
    }

    // GET: api/Leave/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetLeaveById(int id)
    {
        var leave = await _context.LeaveRequests
            .Where(l => l.Id == id)
            .Select(l => new
            {
                l.Id,
                l.EmployeeId,
                EmployeeName = l.Employee != null
                    ? l.Employee.FirstName + " " + l.Employee.LastName
                    : "Unknown",
                l.LeaveType,
                l.StartDate,
                l.EndDate,
                l.Reason,
                l.Status,
                l.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (leave == null)
            return NotFound("Leave request not found.");

        if (!IsManager && CurrentEmployeeId != leave.EmployeeId)
            return Forbid();

        return Ok(leave);
    }

    // GET: api/Leave/employee/1
    [HttpGet("employee/{employeeId}")]
    public async Task<IActionResult> GetEmployeeLeaves(int employeeId)
    {
        if (!IsManager && CurrentEmployeeId != employeeId)
            return Forbid();

        var employeeExists = await _context.Employees
            .AnyAsync(e => e.Id == employeeId);

        if (!employeeExists)
            return NotFound("Employee not found.");

        var leaves = await _context.LeaveRequests
            .Where(l => l.EmployeeId == employeeId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id,
                l.EmployeeId,
                l.LeaveType,
                l.StartDate,
                l.EndDate,
                l.Reason,
                l.Status,
                l.CreatedAt
            })
            .ToListAsync();

        return Ok(leaves);
    }

    // POST: api/Leave
    [HttpPost]
    public async Task<IActionResult> CreateLeaveRequest(
        LeaveRequestDto dto)
    {
        int employeeId;

        if (IsManager)
        {
            employeeId = dto.EmployeeId;
        }
        else
        {
            if (!CurrentEmployeeId.HasValue)
                return Forbid();

            employeeId = CurrentEmployeeId.Value;
        }

        if (dto.EndDate.Date < dto.StartDate.Date)
            return BadRequest("End date cannot be before start date.");

        if (dto.StartDate.Date < DateTime.UtcNow.Date)
            return BadRequest("Leave cannot start in the past.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId);

        if (employee == null)
            return BadRequest("Invalid employee ID.");

        var leave = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveType = dto.LeaveType,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Reason = dto.Reason,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.LeaveRequests.Add(leave);
        await _context.SaveChangesAsync();

        // Notify Admin and HR when an employee submits a request.
        if (!IsManager)
        {
            await _notificationService.CreateForRolesAsync(
                new[] { "Admin", "HR" },
                "New Leave Request",
                $"{employee.FirstName} {employee.LastName} submitted a {leave.LeaveType} leave request.",
                "Leave"
            );
        }

        return Ok(new
        {
            Message = "Leave request submitted successfully.",
            leave.Id,
            leave.EmployeeId,
            leave.LeaveType,
            leave.StartDate,
            leave.EndDate,
            leave.Status
        });
    }

    // PUT: api/Leave/5/status
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> UpdateLeaveStatus(
        int id, LeaveStatusDto dto)
    {
        var leave = await _context.LeaveRequests.FindAsync(id);

        if (leave == null)
            return NotFound("Leave request not found.");

        if (leave.Status != "Pending")
            return BadRequest("Only pending requests can be updated.");

        leave.Status = dto.Status;

        await _context.SaveChangesAsync();

        // Find the employee's linked login account.
        var employeeUser = await _context.Users
            .FirstOrDefaultAsync(u => u.EmployeeId == leave.EmployeeId);

        // Notify the employee about the decision.
        if (employeeUser != null)
        {
            await _notificationService.CreateForUserAsync(
                employeeUser.Id,
                $"Leave Request {leave.Status}",
                $"Your {leave.LeaveType} leave request has been {leave.Status.ToLower()}.",
                "Leave"
            );
        }

        return Ok(new
        {
            Message = "Leave status updated successfully.",
            leave.Id,
            leave.EmployeeId,
            leave.Status
        });
    }

    // DELETE: api/Leave/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLeaveRequest(int id)
    {
        var leave = await _context.LeaveRequests.FindAsync(id);

        if (leave == null)
            return NotFound("Leave request not found.");

        if (!IsManager && CurrentEmployeeId != leave.EmployeeId)
            return Forbid();

        if (leave.Status != "Pending")
            return BadRequest("Only pending requests can be deleted.");

        _context.LeaveRequests.Remove(leave);
        await _context.SaveChangesAsync();

        return Ok("Leave request deleted successfully.");
    }
}
