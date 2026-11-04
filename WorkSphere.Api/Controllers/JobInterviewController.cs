
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;

namespace WorkSphere.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,HR")]
    public class JobInterviewController : ControllerBase
    {
        private readonly AppDbContext _context;

        public JobInterviewController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // GET ALL INTERVIEWS
        // GET: api/JobInterview
        // =========================================

        [HttpGet]
        public async Task<IActionResult> GetAllInterviews()
        {
            var interviews = await _context.JobInterviews
                .AsNoTracking()
                .Include(i => i.JobApplication)
                .ThenInclude(a => a!.JobVacancy)
                .OrderBy(i => i.ScheduledAt)
                .Select(i => new
                {
                    i.Id,
                    i.JobApplicationId,
                    CandidateName = i.JobApplication != null
                        ? i.JobApplication.CandidateName
                        : "Unknown",
                    CandidateEmail = i.JobApplication != null
                        ? i.JobApplication.Email
                        : null,
                    JobTitle = i.JobApplication != null &&
                               i.JobApplication.JobVacancy != null
                        ? i.JobApplication.JobVacancy.Title
                        : "Vacancy unavailable",
                    i.ScheduledAt,
                    i.InterviewType,
                    i.InterviewerName,
                    i.Location,
                    i.Notes,
                    i.Status
                })
                .ToListAsync();

            return Ok(interviews);
        }

        // =========================================
        // GET INTERVIEWS FOR ONE APPLICATION
        // GET: api/JobInterview/application/5
        // =========================================

        [HttpGet("application/{applicationId}")]
        public async Task<IActionResult> GetInterviewsByApplication(
            int applicationId)
        {
            var applicationExists = await _context.JobApplications
                .AnyAsync(a => a.Id == applicationId);

            if (!applicationExists)
            {
                return NotFound(new
                {
                    message = "Job application not found."
                });
            }

            var interviews = await _context.JobInterviews
                .AsNoTracking()
                .Where(i => i.JobApplicationId == applicationId)
                .OrderBy(i => i.ScheduledAt)
                .Select(i => new
                {
                    i.Id,
                    i.JobApplicationId,
                    i.ScheduledAt,
                    i.InterviewType,
                    i.InterviewerName,
                    i.Location,
                    i.Notes,
                    i.Status
                })
                .ToListAsync();

            return Ok(interviews);
        }

        // =========================================
        // GET INTERVIEW BY ID
        // GET: api/JobInterview/5
        // =========================================

        [HttpGet("{id}")]
        public async Task<IActionResult> GetInterviewById(int id)
        {
            var interview = await _context.JobInterviews
                .AsNoTracking()
                .Include(i => i.JobApplication)
                .ThenInclude(a => a!.JobVacancy)
                .Where(i => i.Id == id)
                .Select(i => new
                {
                    i.Id,
                    i.JobApplicationId,
                    CandidateName = i.JobApplication != null
                        ? i.JobApplication.CandidateName
                        : "Unknown",
                    CandidateEmail = i.JobApplication != null
                        ? i.JobApplication.Email
                        : null,
                    JobTitle = i.JobApplication != null &&
                               i.JobApplication.JobVacancy != null
                        ? i.JobApplication.JobVacancy.Title
                        : "Vacancy unavailable",
                    i.ScheduledAt,
                    i.InterviewType,
                    i.InterviewerName,
                    i.Location,
                    i.Notes,
                    i.Status
                })
                .FirstOrDefaultAsync();

            if (interview == null)
            {
                return NotFound(new
                {
                    message = "Interview not found."
                });
            }

            return Ok(interview);
        }

        // =========================================
        // SCHEDULE INTERVIEW
        // POST: api/JobInterview
        // =========================================

        [HttpPost]
        public async Task<IActionResult> ScheduleInterview(
            JobInterviewCreateDto dto)
        {
            var application = await _context.JobApplications
                .FirstOrDefaultAsync(a => a.Id == dto.JobApplicationId);

            if (application == null)
            {
                return NotFound(new
                {
                    message = "Job application not found."
                });
            }

            if (application.Status == "Rejected" ||
                application.Status == "Hired")
            {
                return BadRequest(new
                {
                    message = "An interview cannot be scheduled for a rejected or hired application."
                });
            }

            var interview = new JobInterview
            {
                JobApplicationId = dto.JobApplicationId,
                ScheduledAt = dto.ScheduledAt,
                InterviewType = dto.InterviewType.Trim(),
                InterviewerName = dto.InterviewerName.Trim(),
                Location = dto.Location?.Trim(),
                Notes = dto.Notes?.Trim(),
                Status = "Scheduled"
            };

            _context.JobInterviews.Add(interview);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Interview scheduled successfully.",
                interview.Id,
                interview.JobApplicationId,
                interview.ScheduledAt,
                interview.Status
            });
        }

        // =========================================
        // UPDATE INTERVIEW DETAILS
        // PUT: api/JobInterview/5
        // =========================================

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInterview(
            int id,
            JobInterviewUpdateDto dto)
        {
            var interview = await _context.JobInterviews
                .FindAsync(id);

            if (interview == null)
            {
                return NotFound(new
                {
                    message = "Interview not found."
                });
            }

            if (interview.Status == "Cancelled" ||
                interview.Status == "Completed")
            {
                return BadRequest(new
                {
                    message = "Cancelled or completed interviews cannot be edited."
                });
            }

            interview.ScheduledAt = dto.ScheduledAt;
            interview.InterviewType = dto.InterviewType.Trim();
            interview.InterviewerName = dto.InterviewerName.Trim();
            interview.Location = dto.Location?.Trim();
            interview.Notes = dto.Notes?.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Interview updated successfully."
            });
        }

        // =========================================
        // UPDATE INTERVIEW STATUS
        // PATCH: api/JobInterview/5/status
        // =========================================

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateInterviewStatus(
            int id,
            JobInterviewStatusDto dto)
        {
            var interview = await _context.JobInterviews
                .FindAsync(id);

            if (interview == null)
            {
                return NotFound(new
                {
                    message = "Interview not found."
                });
            }

            var allowedStatuses = new[]
            {
                "Scheduled",
                "Completed",
                "Cancelled"
            };

            var newStatus = allowedStatuses.FirstOrDefault(
                s => s.Equals(
                    dto.Status.Trim(),
                    StringComparison.OrdinalIgnoreCase
                )
            );

            if (newStatus == null)
            {
                return BadRequest(new
                {
                    message = "Invalid status. Allowed values: Scheduled, Completed, Cancelled."
                });
            }

            interview.Status = newStatus;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Interview status updated successfully.",
                interview.Id,
                interview.Status
            });
        }

        // =========================================
        // DELETE INTERVIEW
        // DELETE: api/JobInterview/5
        // =========================================

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInterview(int id)
        {
            var interview = await _context.JobInterviews
                .FindAsync(id);

            if (interview == null)
            {
                return NotFound(new
                {
                    message = "Interview not found."
                });
            }

            _context.JobInterviews.Remove(interview);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Interview deleted successfully."
            });
        }
    }
}
