
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
    public class JobApplicationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public JobApplicationController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // PUBLIC: SUBMIT APPLICATION
        // POST: api/JobApplication
        // =========================================

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> SubmitApplication(
            JobApplicationCreateDto dto)
        {
            var vacancy = await _context.JobVacancies
                .FirstOrDefaultAsync(v => v.Id == dto.JobVacancyId);

            if (vacancy == null)
            {
                return NotFound(new
                {
                    message = "Job vacancy not found."
                });
            }

            if (vacancy.Status != "Open")
            {
                return BadRequest(new
                {
                    message = "Applications are not being accepted for this vacancy."
                });
            }

            if (vacancy.ClosingDate.HasValue &&
                vacancy.ClosingDate.Value.Date < DateTime.UtcNow.Date)
            {
                return BadRequest(new
                {
                    message = "The application deadline has passed."
                });
            }

            var email = dto.Email.Trim().ToLowerInvariant();

            var alreadyApplied = await _context.JobApplications
                .AnyAsync(a =>
                    a.JobVacancyId == dto.JobVacancyId &&
                    a.Email.ToLower() == email);

            if (alreadyApplied)
            {
                return BadRequest(new
                {
                    message = "You have already applied for this vacancy using this email address."
                });
            }

            var application = new JobApplication
            {
                JobVacancyId = dto.JobVacancyId,
                CandidateName = dto.CandidateName.Trim(),
                Email = email,
                Phone = dto.Phone?.Trim(),
                ResumeUrl = dto.ResumeUrl?.Trim(),
                CoverLetter = dto.CoverLetter?.Trim(),
                Status = "Applied",
                AppliedAt = DateTime.UtcNow
            };

            _context.JobApplications.Add(application);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Your application has been submitted successfully.",
                application.Id,
                application.JobVacancyId,
                application.CandidateName,
                application.Email,
                application.Status,
                application.AppliedAt
            });
        }

        // =========================================
        // ADMIN/HR: GET ALL APPLICATIONS
        // GET: api/JobApplication
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpGet]
        public async Task<IActionResult> GetAllApplications()
        {
            var applications = await _context.JobApplications
                .AsNoTracking()
                .Include(a => a.JobVacancy)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new
                {
                    a.Id,
                    a.JobVacancyId,
                    JobTitle = a.JobVacancy != null
                        ? a.JobVacancy.Title
                        : "Vacancy unavailable",
                    a.CandidateName,
                    a.Email,
                    a.Phone,
                    a.ResumeUrl,
                    a.CoverLetter,
                    a.Status,
                    a.AppliedAt
                })
                .ToListAsync();

            return Ok(applications);
        }

        // =========================================
        // ADMIN/HR: GET APPLICATIONS FOR A VACANCY
        // GET: api/JobApplication/vacancy/5
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpGet("vacancy/{vacancyId}")]
        public async Task<IActionResult> GetApplicationsByVacancy(
            int vacancyId)
        {
            var vacancyExists = await _context.JobVacancies
                .AnyAsync(v => v.Id == vacancyId);

            if (!vacancyExists)
            {
                return NotFound(new
                {
                    message = "Job vacancy not found."
                });
            }

            var applications = await _context.JobApplications
                .AsNoTracking()
                .Where(a => a.JobVacancyId == vacancyId)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a => new
                {
                    a.Id,
                    a.JobVacancyId,
                    a.CandidateName,
                    a.Email,
                    a.Phone,
                    a.ResumeUrl,
                    a.CoverLetter,
                    a.Status,
                    a.AppliedAt
                })
                .ToListAsync();

            return Ok(applications);
        }

        // =========================================
        // ADMIN/HR: GET APPLICATION BY ID
        // GET: api/JobApplication/5
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetApplicationById(int id)
        {
            var application = await _context.JobApplications
                .AsNoTracking()
                .Include(a => a.JobVacancy)
                .Include(a => a.Interviews)
                .Where(a => a.Id == id)
                .Select(a => new
                {
                    a.Id,
                    a.JobVacancyId,
                    JobTitle = a.JobVacancy != null
                        ? a.JobVacancy.Title
                        : "Vacancy unavailable",
                    a.CandidateName,
                    a.Email,
                    a.Phone,
                    a.ResumeUrl,
                    a.CoverLetter,
                    a.Status,
                    a.AppliedAt,
                    Interviews = a.Interviews
                        .OrderBy(i => i.ScheduledAt)
                        .Select(i => new
                        {
                            i.Id,
                            i.ScheduledAt,
                            i.InterviewType,
                            i.InterviewerName,
                            i.Location,
                            i.Notes,
                            i.Status
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (application == null)
            {
                return NotFound(new
                {
                    message = "Application not found."
                });
            }

            return Ok(application);
        }

        // =========================================
        // ADMIN/HR: UPDATE APPLICATION STATUS
        // PATCH: api/JobApplication/5/status
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateApplicationStatus(
            int id,
            JobApplicationStatusDto dto)
        {
            var application = await _context.JobApplications
                .FindAsync(id);

            if (application == null)
            {
                return NotFound(new
                {
                    message = "Application not found."
                });
            }

            var allowedStatuses = new[]
            {
                "Applied",
                "UnderReview",
                "Shortlisted",
                "Rejected",
                "Hired"
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
                    message = "Invalid status. Allowed values: Applied, UnderReview, Shortlisted, Rejected, Hired."
                });
            }

            application.Status = newStatus;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Application status updated successfully.",
                application.Id,
                application.Status
            });
        }
    }
}
