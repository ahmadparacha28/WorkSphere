
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,HR")]
public class EmployeeController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public EmployeeController(
        AppDbContext context,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    // GET: api/Employee
    // Supports search, department filtering, account filtering and pagination
    [HttpGet]
    public async Task<IActionResult> GetEmployees(
        string? search,
        int? departmentId,
        string? accountStatus,
        int page = 1,
        int pageSize = 10)
    {
        if (page < 1 || pageSize < 1 || pageSize > 100)
            return BadRequest("Invalid pagination values.");

        var query = _context.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(e =>
                e.FirstName.Contains(search) ||
                e.LastName.Contains(search) ||
                e.Email.Contains(search));
        }

        if (departmentId.HasValue)
        {
            query = query.Where(e =>
                e.DepartmentId == departmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(accountStatus))
        {
            var status = accountStatus.Trim().ToLower();

            if (status == "linked")
            {
                query = query.Where(e =>
                    _context.Users.Any(u => u.EmployeeId == e.Id));
            }
            else if (status == "notlinked")
            {
                query = query.Where(e =>
                    !_context.Users.Any(u => u.EmployeeId == e.Id));
            }
            else
            {
                return BadRequest(
                    "Invalid account status. Use linked or notlinked.");
            }
        }

        var totalRecords = await query.CountAsync();

        var employees = await query
            .OrderBy(e => e.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new
            {
                e.Id,
                e.FirstName,
                e.LastName,
                e.Email,
                e.Phone,
                e.Position,
                e.Salary,
                e.HireDate,
                e.DepartmentId,

                Department = e.Department != null
                    ? e.Department.Name
                    : "Unassigned",

                HasAccount = _context.Users
                    .Any(u => u.EmployeeId == e.Id),

                AccountEmail = _context.Users
                    .Where(u => u.EmployeeId == e.Id)
                    .Select(u => u.Email)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(new
        {
            TotalRecords = totalRecords,
            CurrentPage = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(
                (double)totalRecords / pageSize),
            Data = employees
        });
    }

    // GET: api/Employee/1
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmployee(int id)
    {
        var employee = await _context.Employees
            .Where(e => e.Id == id)
            .Select(e => new
            {
                e.Id,
                e.FirstName,
                e.LastName,
                e.Email,
                e.Phone,
                e.Position,
                e.Salary,
                e.HireDate,
                e.DepartmentId,

                Department = e.Department != null
                    ? e.Department.Name
                    : "Unassigned",

                HasAccount = _context.Users
                    .Any(u => u.EmployeeId == e.Id),

                AccountEmail = _context.Users
                    .Where(u => u.EmployeeId == e.Id)
                    .Select(u => u.Email)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();

        if (employee == null)
            return NotFound("Employee not found.");

        return Ok(employee);
    }

    // POST: api/Employee
    [HttpPost]
    public async Task<IActionResult> CreateEmployee(EmployeeDto dto)
    {
        var departmentExists = await _context.Departments
            .AnyAsync(d => d.Id == dto.DepartmentId);

        if (!departmentExists)
            return BadRequest("Invalid department ID.");

        var emailExists = await _context.Employees
            .AnyAsync(e => e.Email == dto.Email);

        if (emailExists)
            return BadRequest("Email already exists.");

        var employee = new Employee
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            Position = dto.Position,
            Salary = dto.Salary,
            HireDate = dto.HireDate,
            DepartmentId = dto.DepartmentId
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetEmployee),
            new { id = employee.Id },
            new
            {
                employee.Id,
                employee.FirstName,
                employee.LastName,
                employee.Email,
                employee.Phone,
                employee.Position,
                employee.Salary,
                employee.HireDate,
                employee.DepartmentId
            });
    }

    // POST: api/Employee/1/link-account
    [HttpPost("{id}/link-account")]
    public async Task<IActionResult> LinkAccount(int id)
    {
        var employee = await _context.Employees.FindAsync(id);

        if (employee == null)
            return NotFound("Employee not found.");

        var user = await _userManager.FindByEmailAsync(employee.Email);

        if (user == null)
            return NotFound(
                "No registered account found for this employee.");

        if (user.EmployeeId != null)
            return BadRequest("This account is already linked.");

        var alreadyLinked = await _context.Users
            .AnyAsync(u => u.EmployeeId == id);

        if (alreadyLinked)
            return BadRequest(
                "This employee already has a linked account.");

        user.EmployeeId = employee.Id;

        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(new
        {
            Message = "Employee account linked successfully.",
            EmployeeId = employee.Id,
            user.Email
        });
    }

    // PUT: api/Employee/1
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(
        int id, EmployeeDto dto)
    {
        var employee = await _context.Employees.FindAsync(id);

        if (employee == null)
            return NotFound("Employee not found.");

        var departmentExists = await _context.Departments
            .AnyAsync(d => d.Id == dto.DepartmentId);

        if (!departmentExists)
            return BadRequest("Invalid department ID.");

        var emailExists = await _context.Employees
            .AnyAsync(e => e.Email == dto.Email && e.Id != id);

        if (emailExists)
            return BadRequest("Email already exists.");

        employee.FirstName = dto.FirstName;
        employee.LastName = dto.LastName;
        employee.Email = dto.Email;
        employee.Phone = dto.Phone;
        employee.Position = dto.Position;
        employee.Salary = dto.Salary;
        employee.HireDate = dto.HireDate;
        employee.DepartmentId = dto.DepartmentId;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            employee.Id,
            employee.FirstName,
            employee.LastName,
            employee.Email,
            employee.Phone,
            employee.Position,
            employee.Salary,
            employee.HireDate,
            employee.DepartmentId
        });
    }

    // DELETE: api/Employee/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var employee = await _context.Employees.FindAsync(id);

        if (employee == null)
            return NotFound("Employee not found.");

        _context.Employees.Remove(employee);

        await _context.SaveChangesAsync();

        return Ok("Employee deleted successfully.");
    }
}
