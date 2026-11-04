
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Employee")]
public class EmployeePerformanceController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeePerformanceController(AppDbContext context)
    {
        _context = context;
    }

    private bool TryGetEmployeeId(out int employeeId)
    {
        var value =
            User.FindFirst("EmployeeId")?.Value ??
            User.FindFirst("employeeId")?.Value;

        return int.TryParse(value, out employeeId);
    }

    // GET: api/EmployeePerformance/reviews
    [HttpGet("reviews")]
    public async Task<IActionResult> GetMyReviews()
    {
        if (!TryGetEmployeeId(out var employeeId))
        {
            return BadRequest(new
            {
                message = "Your account is not linked to an employee record."
            });
        }

        var reviews = await _context.PerformanceReviews
            .Where(r =>
                r.EmployeeId == employeeId &&
                r.Status == "Published")
            .Include(r => r.PerformanceReviewCycle)
            .OrderByDescending(r => r.PublishedAt)
            .Select(r => new
            {
                r.Id,
                r.PerformanceReviewCycleId,
                CycleName = r.PerformanceReviewCycle!.Name,
                CycleStartDate = r.PerformanceReviewCycle.StartDate,
                CycleEndDate = r.PerformanceReviewCycle.EndDate,
                r.WorkQualityRating,
                r.ProductivityRating,
                r.CommunicationRating,
                r.TeamworkRating,
                r.PunctualityRating,
                r.OverallRating,
                r.Strengths,
                r.AreasForImprovement,
                r.ManagerComments,
                r.PublishedAt
            })
            .ToListAsync();

        return Ok(reviews);
    }

    // GET: api/EmployeePerformance/reviews/5
    [HttpGet("reviews/{id}")]
    public async Task<IActionResult> GetMyReview(int id)
    {
        if (!TryGetEmployeeId(out var employeeId))
        {
            return BadRequest(new
            {
                message = "Your account is not linked to an employee record."
            });
        }

        var review = await _context.PerformanceReviews
            .Where(r =>
                r.Id == id &&
                r.EmployeeId == employeeId &&
                r.Status == "Published")
            .Include(r => r.PerformanceReviewCycle)
            .Select(r => new
            {
                r.Id,
                CycleName = r.PerformanceReviewCycle!.Name,
                CycleStartDate = r.PerformanceReviewCycle.StartDate,
                CycleEndDate = r.PerformanceReviewCycle.EndDate,
                r.WorkQualityRating,
                r.ProductivityRating,
                r.CommunicationRating,
                r.TeamworkRating,
                r.PunctualityRating,
                r.OverallRating,
                r.Strengths,
                r.AreasForImprovement,
                r.ManagerComments,
                r.PublishedAt
            })
            .FirstOrDefaultAsync();

        if (review == null)
        {
            return NotFound(new
            {
                message = "Published performance review not found."
            });
        }

        return Ok(review);
    }
}
