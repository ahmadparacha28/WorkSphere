using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;

namespace WorkSphere.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,HR")]
    public class OffboardingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OffboardingController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Offboarding
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var records = await _context.EmployeeOffboardings
                .Include(o => o.Employee)
                    .ThenInclude(e => e!.Department)
                .Include(o => o.Tasks)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new
                {
                    o.Id,
                    o.EmployeeId,
                    EmployeeName = o.Employee!.FirstName + " " + o.Employee.LastName,
                    Department = o.Employee.Department != null
                        ? o.Employee.Department.Name : "",
                    o.Reason,
                    o.ResignationDate,
                    o.LastWorkingDate,
                    o.CompletedAt,
                    o.Status,
                    o.ExitInterviewNotes,
                    Tasks = o.Tasks.Select(t => new
                    {
                        t.Id,
                        t.Title,
                        t.Description,
                        t.AssignedTo,
                        t.Status,
                        t.DueDate,
                        t.CompletedAt
                    })
                })
                .ToListAsync();

            return Ok(records);
        }

        // GET: api/Offboarding/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var record = await _context.EmployeeOffboardings
                .Include(o => o.Employee)
                    .ThenInclude(e => e!.Department)
                .Include(o => o.Tasks)
                .Where(o => o.Id == id)
                .Select(o => new
                {
                    o.Id,
                    o.EmployeeId,
                    EmployeeName = o.Employee!.FirstName + " " + o.Employee.LastName,
                    Department = o.Employee.Department != null
                        ? o.Employee.Department.Name : "",
                    o.Reason,
                    o.ResignationDate,
                    o.LastWorkingDate,
                    o.CompletedAt,
                    o.Status,
                    o.ExitInterviewNotes,
                    Tasks = o.Tasks.Select(t => new
                    {
                        t.Id,
                        t.Title,
                        t.Description,
                        t.AssignedTo,
                        t.Status,
                        t.DueDate,
                        t.CompletedAt
                    })
                })
                .FirstOrDefaultAsync();

            if (record == null)
                return NotFound(new { message = "Offboarding record not found." });

            return Ok(record);
        }

        // POST: api/Offboarding
        [HttpPost]
        public async Task<IActionResult> Create(OffboardingCreateDto dto)
        {
            var employee = await _context.Employees
                .FindAsync(dto.EmployeeId);

            if (employee == null)
                return NotFound(new { message = "Employee not found." });

            if (dto.LastWorkingDate.Date < dto.ResignationDate.Date)
                return BadRequest(new
                {
                    message = "Last working date cannot be earlier than resignation date."
                });

            var activeRecord = await _context.EmployeeOffboardings
                .AnyAsync(o => o.EmployeeId == dto.EmployeeId &&
                               o.Status == "InProgress");

            if (activeRecord)
                return BadRequest(new
                {
                    message = "This employee already has an active offboarding record."
                });

            var offboarding = new EmployeeOffboarding
            {
                EmployeeId = dto.EmployeeId,
                Reason = dto.Reason,
                ResignationDate = dto.ResignationDate,
                LastWorkingDate = dto.LastWorkingDate,
                ExitInterviewNotes = dto.ExitInterviewNotes,
                Status = "InProgress"
            };

            _context.EmployeeOffboardings.Add(offboarding);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = offboarding.Id },
                new
                {
                    message = "Offboarding record created successfully.",
                    offboarding.Id
                });
        }

        // POST: api/Offboarding/5/tasks
        [HttpPost("{id}/tasks")]
        public async Task<IActionResult> AddTask(
            int id,
            OffboardingTaskCreateDto dto)
        {
            var offboarding = await _context.EmployeeOffboardings
                .FirstOrDefaultAsync(o => o.Id == id);

            if (offboarding == null)
                return NotFound(new { message = "Offboarding record not found." });

            if (offboarding.Status != "InProgress")
                return BadRequest(new { message = "This offboarding record is not active." });

            var task = new OffboardingTask
            {
                EmployeeOffboardingId = id,
                Title = dto.Title,
                Description = dto.Description,
                AssignedTo = dto.AssignedTo,
                DueDate = dto.DueDate,
                Status = "Pending"
            };

            _context.OffboardingTasks.Add(task);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Offboarding task added successfully.",
                task.Id
            });
        }

        // PATCH: api/Offboarding/tasks/5/status
        [HttpPatch("tasks/{taskId}/status")]
        public async Task<IActionResult> UpdateTaskStatus(
            int taskId,
            TaskStatusUpdateDto dto)
        {
            var validStatuses = new[]
            {
                "Pending", "InProgress", "Completed", "Skipped"
            };

            if (!validStatuses.Contains(dto.Status))
                return BadRequest(new { message = "Invalid task status." });

            var task = await _context.OffboardingTasks
                .Include(t => t.EmployeeOffboarding)
                    .ThenInclude(o => o!.Tasks)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
                return NotFound(new { message = "Task not found." });

            var offboarding = task.EmployeeOffboarding!;

            if (offboarding.Status != "InProgress")
                return BadRequest(new { message = "This offboarding record is not active." });

            task.Status = dto.Status;
            task.CompletedAt = dto.Status == "Completed"
                ? DateTime.UtcNow : null;

            bool allFinished = offboarding.Tasks.Any() &&
                offboarding.Tasks.All(t =>
                    t.Status == "Completed" || t.Status == "Skipped");

            if (allFinished)
            {
                offboarding.Status = "Completed";
                offboarding.CompletedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

           return Ok(new
{
    message = "Task status updated successfully.",
    TaskStatus = task.Status,
    OffboardingStatus = offboarding.Status
});
        }

        // PATCH: api/Offboarding/5/exit-interview
        [HttpPatch("{id}/exit-interview")]
        public async Task<IActionResult> UpdateExitInterview(
            int id,
            [FromBody] string notes)
        {
            var offboarding = await _context.EmployeeOffboardings
                .FindAsync(id);

            if (offboarding == null)
                return NotFound(new { message = "Offboarding record not found." });

            if (offboarding.Status != "InProgress")
                return BadRequest(new { message = "This offboarding record is not active." });

            offboarding.ExitInterviewNotes = notes;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Exit interview notes saved successfully." });
        }
    }
}