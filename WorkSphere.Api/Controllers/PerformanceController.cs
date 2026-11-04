
using System.Security.Claims;
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
public class PerformanceController : ControllerBase
{
    private readonly AppDbContext _context;

    public PerformanceController(AppDbContext context)
    {
        _context = context;
    }

    private string? GetReviewerId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirst("sub")?.Value;
    }

    private static decimal CalculateRating(PerformanceReview review)
    {
        var average = (
            review.WorkQualityRating +
            review.ProductivityRating +
            review.CommunicationRating +
            review.TeamworkRating +
            review.PunctualityRating
        ) / 5m;

        return Math.Round(average, 2);
    }

    // GET: api/Performance/cycles
    [HttpGet("cycles")]
    public async Task<IActionResult> GetCycles()
    {
        var cycles = await _context.PerformanceReviewCycles
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Description,
                c.StartDate,
                c.EndDate,
                c.Status,
                c.CreatedAt,
                TotalReviews = c.Reviews.Count,
                PublishedReviews = c.Reviews.Count(
                    r => r.Status == "Published")
            })
            .OrderByDescending(c => c.StartDate)
            .ToListAsync();

        return Ok(cycles);
    }

    // POST: api/Performance/cycles
    [HttpPost("cycles")]
    public async Task<IActionResult> CreateCycle(
        PerformanceReviewCycleDto dto)
    {
        if (dto.EndDate.Date < dto.StartDate.Date)
        {
            return BadRequest(new
            {
                message = "End date cannot be earlier than start date."
            });
        }

        var cycle = new PerformanceReviewCycle
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = "Active"
        };

        _context.PerformanceReviewCycles.Add(cycle);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetCycles),
            new { id = cycle.Id },
            new
            {
                message = "Performance review cycle created successfully.",
                cycle.Id,
                cycle.Name,
                cycle.Status
            });
    }

    // PUT: api/Performance/cycles/5
    [HttpPut("cycles/{id}")]
    public async Task<IActionResult> UpdateCycle(
        int id,
        PerformanceReviewCycleDto dto)
    {
        var cycle = await _context.PerformanceReviewCycles
            .FindAsync(id);

        if (cycle == null)
            return NotFound(new { message = "Review cycle not found." });

        if (dto.EndDate.Date < dto.StartDate.Date)
        {
            return BadRequest(new
            {
                message = "End date cannot be earlier than start date."
            });
        }

        cycle.Name = dto.Name.Trim();
        cycle.Description = dto.Description?.Trim();
        cycle.StartDate = dto.StartDate;
        cycle.EndDate = dto.EndDate;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Review cycle updated successfully." });
    }

    // PATCH: api/Performance/cycles/5/close
    [HttpPatch("cycles/{id}/close")]
    public async Task<IActionResult> CloseCycle(int id)
    {
        var cycle = await _context.PerformanceReviewCycles
            .FindAsync(id);

        if (cycle == null)
            return NotFound(new { message = "Review cycle not found." });

        cycle.Status = "Closed";

        await _context.SaveChangesAsync();

        return Ok(new { message = "Review cycle closed successfully." });
    }

    // DELETE: api/Performance/cycles/5
    [HttpDelete("cycles/{id}")]
    public async Task<IActionResult> DeleteCycle(int id)
    {
        var cycle = await _context.PerformanceReviewCycles
            .Include(c => c.Reviews)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cycle == null)
            return NotFound(new { message = "Review cycle not found." });

        if (cycle.Reviews.Any())
        {
            return BadRequest(new
            {
                message = "A cycle containing reviews cannot be deleted."
            });
        }

        _context.PerformanceReviewCycles.Remove(cycle);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Review cycle deleted successfully." });
    }

    // GET: api/Performance/reviews
    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews(
        int? cycleId,
        int? employeeId,
        string? status)
    {
        var query = _context.PerformanceReviews
            .Include(r => r.Employee)
                .ThenInclude(e => e!.Department)
            .Include(r => r.PerformanceReviewCycle)
            .AsQueryable();

        if (cycleId.HasValue)
            query = query.Where(r =>
                r.PerformanceReviewCycleId == cycleId.Value);

        if (employeeId.HasValue)
            query = query.Where(r =>
                r.EmployeeId == employeeId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r =>
                r.Status == status);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.EmployeeId,
                EmployeeName = r.Employee!.FirstName + " " +
                               r.Employee.LastName,
                EmployeeEmail = r.Employee.Email,
                Position = r.Employee.Position,
                DepartmentName = r.Employee.Department != null
                    ? r.Employee.Department.Name
                    : "Not Assigned",
                r.PerformanceReviewCycleId,
                CycleName = r.PerformanceReviewCycle!.Name,
                r.WorkQualityRating,
                r.ProductivityRating,
                r.CommunicationRating,
                r.TeamworkRating,
                r.PunctualityRating,
                r.OverallRating,
                r.Strengths,
                r.AreasForImprovement,
                r.ManagerComments,
                r.Status,
                r.ReviewerUserId,
                r.PublishedAt,
                r.CreatedAt,
                r.UpdatedAt
            })
            .ToListAsync();

        return Ok(reviews);
    }

    // POST: api/Performance/reviews
    [HttpPost("reviews")]
    public async Task<IActionResult> CreateReview(
        PerformanceReviewCreateDto dto)
    {
        var employeeExists = await _context.Employees
            .AnyAsync(e => e.Id == dto.EmployeeId);

        if (!employeeExists)
        {
            return NotFound(new
            {
                message = "Employee not found."
            });
        }

        var cycle = await _context.PerformanceReviewCycles
            .FirstOrDefaultAsync(c =>
                c.Id == dto.PerformanceReviewCycleId);

        if (cycle == null)
            return NotFound(new { message = "Review cycle not found." });

        if (cycle.Status != "Active")
        {
            return BadRequest(new
            {
                message = "You cannot create reviews in a closed cycle."
            });
        }

        var alreadyExists = await _context.PerformanceReviews
            .AnyAsync(r =>
                r.EmployeeId == dto.EmployeeId &&
                r.PerformanceReviewCycleId ==
                    dto.PerformanceReviewCycleId);

        if (alreadyExists)
        {
            return BadRequest(new
            {
                message = "A review already exists for this employee in this cycle."
            });
        }

        var review = new PerformanceReview
        {
            EmployeeId = dto.EmployeeId,
            PerformanceReviewCycleId = dto.PerformanceReviewCycleId,
            ReviewerUserId = GetReviewerId(),
            WorkQualityRating = dto.WorkQualityRating,
            ProductivityRating = dto.ProductivityRating,
            CommunicationRating = dto.CommunicationRating,
            TeamworkRating = dto.TeamworkRating,
            PunctualityRating = dto.PunctualityRating,
            Strengths = dto.Strengths?.Trim(),
            AreasForImprovement = dto.AreasForImprovement?.Trim(),
            ManagerComments = dto.ManagerComments?.Trim(),
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        review.OverallRating = CalculateRating(review);

        _context.PerformanceReviews.Add(review);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Performance review created successfully.",
            review.Id,
            review.OverallRating,
            review.Status
        });
    }

    // PUT: api/Performance/reviews/5
    [HttpPut("reviews/{id}")]
    public async Task<IActionResult> UpdateReview(
        int id,
        PerformanceReviewUpdateDto dto)
    {
        var review = await _context.PerformanceReviews
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null)
            return NotFound(new { message = "Performance review not found." });

        if (review.Status == "Published")
        {
            return BadRequest(new
            {
                message = "Published reviews cannot be edited."
            });
        }

        review.WorkQualityRating = dto.WorkQualityRating;
        review.ProductivityRating = dto.ProductivityRating;
        review.CommunicationRating = dto.CommunicationRating;
        review.TeamworkRating = dto.TeamworkRating;
        review.PunctualityRating = dto.PunctualityRating;
        review.Strengths = dto.Strengths?.Trim();
        review.AreasForImprovement = dto.AreasForImprovement?.Trim();
        review.ManagerComments = dto.ManagerComments?.Trim();
        review.OverallRating = CalculateRating(review);
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Performance review updated successfully.",
            review.OverallRating
        });
    }

    // PATCH: api/Performance/reviews/5/publish
    [HttpPatch("reviews/{id}/publish")]
    public async Task<IActionResult> PublishReview(int id)
    {
        var review = await _context.PerformanceReviews
            .Include(r => r.PerformanceReviewCycle)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null)
            return NotFound(new { message = "Performance review not found." });

        if (review.Status == "Published")
        {
            return BadRequest(new
            {
                message = "This review has already been published."
            });
        }

        if (review.PerformanceReviewCycle?.Status != "Active")
        {
            return BadRequest(new
            {
                message = "The review cycle is closed. This review cannot be published."
            });
        }

        review.OverallRating = CalculateRating(review);
        review.Status = "Published";
        review.PublishedAt = DateTime.UtcNow;
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Performance review published successfully.",
            review.Id,
            review.OverallRating,
            review.PublishedAt
        });
    }
}
