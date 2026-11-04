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
    public class OnboardingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OnboardingController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Onboarding
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var records = await _context.EmployeeOnboardings
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
                    o.StartDate,
                    o.CompletedAt,
                    o.Status,
                    o.ProgressPercentage,
                    o.Notes,
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

        // GET: api/Onboarding/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var record = await _context.EmployeeOnboardings
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
                    o.StartDate,
                    o.CompletedAt,
                    o.Status,
                    o.ProgressPercentage,
                    o.Notes,
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
                return NotFound(new { message = "Onboarding record not found." });

            return Ok(record);
        }

        // POST: api/Onboarding
        [HttpPost]
        public async Task<IActionResult> Create(OnboardingCreateDto dto)
        {
            var employee = await _context.Employees
                .FindAsync(dto.EmployeeId);

            if (employee == null)
                return NotFound(new { message = "Employee not found." });

            var activeRecord = await _context.EmployeeOnboardings
                .AnyAsync(o => o.EmployeeId == dto.EmployeeId &&
                               o.Status == "InProgress");

            if (activeRecord)
                return BadRequest(new
                {
                    message = "This employee already has an active onboarding record."
                });

            var onboarding = new EmployeeOnboarding
            {
                EmployeeId = dto.EmployeeId,
                StartDate = dto.StartDate == default
                    ? DateTime.UtcNow : dto.StartDate,
                Notes = dto.Notes,
                Status = "InProgress",
                ProgressPercentage = 0
            };

            _context.EmployeeOnboardings.Add(onboarding);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = onboarding.Id },
                new
                {
                    message = "Onboarding record created successfully.",
                    onboarding.Id
                });
        }

        // POST: api/Onboarding/5/tasks
        [HttpPost("{id}/tasks")]
        public async Task<IActionResult> AddTask(
            int id,
            OnboardingTaskCreateDto dto)
        {
            var onboarding = await _context.EmployeeOnboardings
                .Include(o => o.Tasks)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (onboarding == null)
                return NotFound(new { message = "Onboarding record not found." });

            if (onboarding.Status != "InProgress")
                return BadRequest(new { message = "This onboarding record is not active." });

            var task = new OnboardingTask
            {
                EmployeeOnboardingId = id,
                Title = dto.Title,
                Description = dto.Description,
                AssignedTo = dto.AssignedTo,
                DueDate = dto.DueDate,
                Status = "Pending"
            };

            _context.OnboardingTasks.Add(task);

            // Recalculate progress after adding a task.
            onboarding.ProgressPercentage = CalculateProgress(onboarding.Tasks);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Onboarding task added successfully.",
                task.Id
            });
        }

        // PATCH: api/Onboarding/tasks/5/status
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

            var task = await _context.OnboardingTasks
                .Include(t => t.EmployeeOnboarding)
                    .ThenInclude(o => o!.Tasks)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
                return NotFound(new { message = "Task not found." });

            var onboarding = task.EmployeeOnboarding!;

            if (onboarding.Status != "InProgress")
                return BadRequest(new { message = "This onboarding record is not active." });

            task.Status = dto.Status;
            task.CompletedAt = dto.Status == "Completed"
                ? DateTime.UtcNow : null;

            onboarding.ProgressPercentage =
                CalculateProgress(onboarding.Tasks);

            var allFinished = onboarding.Tasks.Any() &&
                onboarding.Tasks.All(t =>
                    t.Status == "Completed" || t.Status == "Skipped");

            if (allFinished)
            {
                onboarding.Status = "Completed";
                onboarding.CompletedAt = DateTime.UtcNow;
                onboarding.ProgressPercentage = 100;
            }

            await _context.SaveChangesAsync();

           return Ok(new
{
    message = "Task status updated successfully.",
    TaskStatus = task.Status,
    onboarding.ProgressPercentage,
    OnboardingStatus = onboarding.Status
});
        }

        private static int CalculateProgress(
            ICollection<OnboardingTask> tasks)
        {
            if (!tasks.Any())
                return 0;

            int finished = tasks.Count(t =>
                t.Status == "Completed" || t.Status == "Skipped");

            return (int)Math.Round(
                (double)finished / tasks.Count * 100);
        }
    }
}