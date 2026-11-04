
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;
using Microsoft.AspNetCore.Authorization;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,HR")]
public class DepartmentController : ControllerBase
{
    private readonly AppDbContext _context;

    public DepartmentController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Department
    [HttpGet]
    public async Task<IActionResult> GetDepartments()
    {
        var departments = await _context.Departments
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Description,
                EmployeeCount = d.Employees.Count
            })
            .ToListAsync();

        return Ok(departments);
    }

    // GET: api/Department/1
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDepartment(int id)
    {
        var department = await _context.Departments
            .Where(d => d.Id == id)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Description,
                Employees = d.Employees.Select(e => new
                {
                    e.Id,
                    e.FirstName,
                    e.LastName,
                    e.Email,
                    e.Position
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (department == null)
            return NotFound("Department not found.");

        return Ok(department);
    }

    // POST: api/Department
    [HttpPost]
    public async Task<IActionResult> CreateDepartment(
        DepartmentDto dto)
    {
        var department = new Department
        {
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Departments.Add(department);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetDepartment),
            new { id = department.Id },
            new
            {
                department.Id,
                department.Name,
                department.Description
            });
    }

    // PUT: api/Department/1
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDepartment(
        int id, DepartmentDto dto)
    {
        var department = await _context.Departments.FindAsync(id);

        if (department == null)
            return NotFound("Department not found.");

        department.Name = dto.Name;
        department.Description = dto.Description;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            department.Id,
            department.Name,
            department.Description
        });
    }

    // DELETE: api/Department/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDepartment(int id)
    {
        var department = await _context.Departments
            .Include(d => d.Employees)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
            return NotFound("Department not found.");

        if (department.Employees.Any())
        {
            return BadRequest(
                "Cannot delete a department with employees.");
        }

        _context.Departments.Remove(department);

        await _context.SaveChangesAsync();

        return Ok("Department deleted successfully.");
    }
}
