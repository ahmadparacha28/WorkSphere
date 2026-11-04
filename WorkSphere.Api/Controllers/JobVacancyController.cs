
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
    public class JobVacancyController : ControllerBase
    {
        private readonly AppDbContext _context;

        public JobVacancyController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // PUBLIC: GET ALL OPEN VACANCIES
        // GET: api/JobVacancy/public
        // =========================================

        [AllowAnonymous]
        [HttpGet("public")]
        public async Task<IActionResult> GetPublicVacancies()
        {
            var today = DateTime.UtcNow.Date;

            var vacancies = await _context.JobVacancies
                .Where(v =>
                    v.Status == "Open" &&
                    (!v.ClosingDate.HasValue ||
                     v.ClosingDate.Value.Date >= today))
                .OrderByDescending(v => v.PostedAt)
                .Select(v => new
                {
                    v.Id,
                    v.Title,
                    v.Description,
                    v.Department,
                    v.EmploymentType,
                    v.Location,
                    v.SalaryRange,
                    v.Requirements,
                    v.PostedAt,
                    v.ClosingDate
                })
                .ToListAsync();

            return Ok(vacancies);
        }

        // =========================================
        // PUBLIC: GET SINGLE OPEN VACANCY
        // GET: api/JobVacancy/public/5
        // =========================================

        [AllowAnonymous]
        [HttpGet("public/{id}")]
        public async Task<IActionResult> GetPublicVacancy(int id)
        {
            var today = DateTime.UtcNow.Date;

            var vacancy = await _context.JobVacancies
                .Where(v =>
                    v.Id == id &&
                    v.Status == "Open" &&
                    (!v.ClosingDate.HasValue ||
                     v.ClosingDate.Value.Date >= today))
                .Select(v => new
                {
                    v.Id,
                    v.Title,
                    v.Description,
                    v.Department,
                    v.EmploymentType,
                    v.Location,
                    v.SalaryRange,
                    v.Requirements,
                    v.PostedAt,
                    v.ClosingDate
                })
                .FirstOrDefaultAsync();

            if (vacancy == null)
            {
                return NotFound(new
                {
                    message = "Job vacancy not found or is no longer available."
                });
            }

            return Ok(vacancy);
        }

        // =========================================
        // ADMIN/HR: GET ALL VACANCIES
        // GET: api/JobVacancy
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpGet]
        public async Task<IActionResult> GetAllVacancies()
        {
            var vacancies = await _context.JobVacancies
                .OrderByDescending(v => v.PostedAt)
                .Select(v => new
                {
                    v.Id,
                    v.Title,
                    v.Description,
                    v.Department,
                    v.EmploymentType,
                    v.Location,
                    v.SalaryRange,
                    v.Requirements,
                    v.Status,
                    v.PostedAt,
                    v.ClosingDate,
                    ApplicationCount = v.Applications.Count()
                })
                .ToListAsync();

            return Ok(vacancies);
        }

        // =========================================
        // ADMIN/HR: GET VACANCY BY ID
        // GET: api/JobVacancy/5
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetVacancyById(int id)
        {
            var vacancy = await _context.JobVacancies
                .Where(v => v.Id == id)
                .Select(v => new
                {
                    v.Id,
                    v.Title,
                    v.Description,
                    v.Department,
                    v.EmploymentType,
                    v.Location,
                    v.SalaryRange,
                    v.Requirements,
                    v.Status,
                    v.PostedAt,
                    v.ClosingDate,
                    ApplicationCount = v.Applications.Count()
                })
                .FirstOrDefaultAsync();

            if (vacancy == null)
            {
                return NotFound(new
                {
                    message = "Job vacancy not found."
                });
            }

            return Ok(vacancy);
        }

        // =========================================
        // ADMIN/HR: CREATE VACANCY
        // POST: api/JobVacancy
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpPost]
        public async Task<IActionResult> CreateVacancy(
            JobVacancyCreateDto dto)
        {
            if (dto.ClosingDate.HasValue &&
                dto.ClosingDate.Value.Date < DateTime.UtcNow.Date)
            {
                return BadRequest(new
                {
                    message = "Closing date cannot be in the past."
                });
            }

            var vacancy = new JobVacancy
            {
                Title = dto.Title.Trim(),
                Description = dto.Description.Trim(),
                Department = dto.Department.Trim(),
                EmploymentType = dto.EmploymentType.Trim(),
                Location = dto.Location.Trim(),
                SalaryRange = dto.SalaryRange?.Trim(),
                Requirements = dto.Requirements?.Trim(),
                ClosingDate = dto.ClosingDate,
                Status = "Open",
                PostedAt = DateTime.UtcNow
            };

            _context.JobVacancies.Add(vacancy);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetVacancyById),
                new { id = vacancy.Id },
                new
                {
                    message = "Job vacancy created successfully.",
                    vacancy.Id,
                    vacancy.Title,
                    vacancy.Status
                });
        }

        // =========================================
        // ADMIN/HR: UPDATE VACANCY
        // PUT: api/JobVacancy/5
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVacancy(
            int id,
            JobVacancyUpdateDto dto)
        {
            var vacancy = await _context.JobVacancies
                .FindAsync(id);

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
                    message = "Only open vacancies can be updated."
                });
            }

            if (dto.ClosingDate.HasValue &&
                dto.ClosingDate.Value.Date < DateTime.UtcNow.Date)
            {
                return BadRequest(new
                {
                    message = "Closing date cannot be in the past."
                });
            }

            vacancy.Title = dto.Title.Trim();
            vacancy.Description = dto.Description.Trim();
            vacancy.Department = dto.Department.Trim();
            vacancy.EmploymentType = dto.EmploymentType.Trim();
            vacancy.Location = dto.Location.Trim();
            vacancy.SalaryRange = dto.SalaryRange?.Trim();
            vacancy.Requirements = dto.Requirements?.Trim();
            vacancy.ClosingDate = dto.ClosingDate;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Job vacancy updated successfully."
            });
        }

        // =========================================
        // ADMIN/HR: CLOSE VACANCY
        // PATCH: api/JobVacancy/5/close
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpPatch("{id}/close")]
        public async Task<IActionResult> CloseVacancy(int id)
        {
            var vacancy = await _context.JobVacancies
                .FindAsync(id);

            if (vacancy == null)
            {
                return NotFound(new
                {
                    message = "Job vacancy not found."
                });
            }

            if (vacancy.Status == "Closed")
            {
                return BadRequest(new
                {
                    message = "This vacancy is already closed."
                });
            }

            vacancy.Status = "Closed";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Job vacancy closed successfully."
            });
        }

        // =========================================
        // ADMIN/HR: DELETE VACANCY
        // DELETE: api/JobVacancy/5
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVacancy(int id)
        {
            var vacancy = await _context.JobVacancies
                .FindAsync(id);

            if (vacancy == null)
            {
                return NotFound(new
                {
                    message = "Job vacancy not found."
                });
            }

            _context.JobVacancies.Remove(vacancy);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Job vacancy and its associated applications deleted successfully."
            });
        }
    }
}
