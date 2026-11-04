
using System.IO.Compression;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;

namespace WorkSphere.Api.Controllers
{
    [ApiController]
    [Route("api/JobApplication")]
    public class ResumeController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        private static readonly string[] AllowedExtensions =
        {
            ".pdf", ".doc", ".docx"
        };

        public ResumeController(
            AppDbContext context,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _context = context;
            _environment = environment;
            _configuration = configuration;
        }

        // =========================================
        // PUBLIC: SUBMIT APPLICATION WITH RESUME
        // POST: api/JobApplication/with-resume
        // Content-Type: multipart/form-data
        // =========================================

        [AllowAnonymous]
        [HttpPost("with-resume")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 6 * 1024 * 1024)]
        public async Task<IActionResult> SubmitApplicationWithResume(
            [FromForm] JobApplicationUploadDto dto)
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

            var maxFileSizeMB = _configuration.GetValue<int>(
                "FileUpload:MaxFileSizeMB", 5);

            if (maxFileSizeMB <= 0)
                maxFileSizeMB = 5;

            string? storedFileName = null;
            string? savedFilePath = null;

            if (dto.ResumeFile != null)
            {
                var file = dto.ResumeFile;
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

                if (!AllowedExtensions.Contains(extension))
                {
                    return BadRequest(new
                    {
                        message = "Only PDF, DOC, and DOCX resume files are allowed."
                    });
                }

                if (file.Length == 0)
                {
                    return BadRequest(new
                    {
                        message = "The uploaded resume is empty."
                    });
                }

                var maxFileSize = (long)maxFileSizeMB * 1024 * 1024;

                if (file.Length > maxFileSize)
                {
                    return BadRequest(new
                    {
                        message = $"Resume file size cannot exceed {maxFileSizeMB} MB."
                    });
                }

                if (!await IsValidResumeFile(file, extension))
                {
                    return BadRequest(new
                    {
                        message = "The uploaded file does not appear to be a valid PDF, DOC, or DOCX document."
                    });
                }

                var resumeFolder = _configuration[
                    "FileUpload:ResumeFolder"] ?? "App_Data/Resumes";

                var storagePath = Path.GetFullPath(
                    Path.Combine(_environment.ContentRootPath, resumeFolder));

                Directory.CreateDirectory(storagePath);

                storedFileName = $"{Guid.NewGuid():N}{extension}";
                savedFilePath = Path.Combine(storagePath, storedFileName);

                await using (var fileStream = new FileStream(
                    savedFilePath,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None))
                {
                    await file.CopyToAsync(fileStream);
                }
            }

            var application = new JobApplication
            {
                JobVacancyId = dto.JobVacancyId,
                CandidateName = dto.CandidateName.Trim(),
                Email = email,
                Phone = dto.Phone?.Trim(),
                ResumeUrl = storedFileName,
                CoverLetter = dto.CoverLetter?.Trim(),
                Status = "Applied",
                AppliedAt = DateTime.UtcNow
            };

            try
            {
                _context.JobApplications.Add(application);
                await _context.SaveChangesAsync();
            }
            catch
            {
                if (savedFilePath != null &&
                    System.IO.File.Exists(savedFilePath))
                {
                    System.IO.File.Delete(savedFilePath);
                }

                throw;
            }

            return Ok(new
            {
                message = "Your application has been submitted successfully.",
                application.Id,
                application.JobVacancyId,
                application.CandidateName,
                application.Email,
                application.Status,
                application.AppliedAt,
                resumeUploaded = storedFileName != null
            });
        }

        // =========================================
        // ADMIN/HR: DOWNLOAD AN UPLOADED RESUME
        // GET: api/JobApplication/5/resume
        // =========================================

        [Authorize(Roles = "Admin,HR")]
        [HttpGet("{id:int}/resume")]
        public async Task<IActionResult> DownloadResume(int id)
        {
            var application = await _context.JobApplications
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null)
            {
                return NotFound(new
                {
                    message = "Application not found."
                });
            }

            var storedFileName = application.ResumeUrl;

            if (string.IsNullOrWhiteSpace(storedFileName))
            {
                return NotFound(new
                {
                    message = "No uploaded resume is available for this application."
                });
            }

            // Only accept our generated GUID-based filenames.
            var safeFileName = Path.GetFileName(storedFileName);
            var extension = Path.GetExtension(safeFileName).ToLowerInvariant();
            var nameWithoutExtension = Path.GetFileNameWithoutExtension(safeFileName);

            if (!Guid.TryParseExact(nameWithoutExtension, "N", out _) ||
                !AllowedExtensions.Contains(extension))
            {
                return NotFound(new
                {
                    message = "No uploaded resume is available for this application."
                });
            }

            var resumeFolder = _configuration[
                "FileUpload:ResumeFolder"] ?? "App_Data/Resumes";

            var storagePath = Path.GetFullPath(
                Path.Combine(_environment.ContentRootPath, resumeFolder));

            var filePath = Path.Combine(storagePath, safeFileName);

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound(new
                {
                    message = "Resume file could not be found."
                });
            }

            var contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };

            var stream = new FileStream(
                filePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read);

            Response.Headers["X-Content-Type-Options"] = "nosniff";

            return File(
                stream,
                contentType,
                $"Resume-{application.Id}{extension}");
        }

        // =========================================
        // CHECK FILE SIGNATURE
        // Do not rely only on the file extension.
        // =========================================

        private static async Task<bool> IsValidResumeFile(
            IFormFile file,
            string extension)
        {
            try
            {
                await using var stream = file.OpenReadStream();

                var header = new byte[8];
                var bytesRead = await stream.ReadAsync(header, 0, header.Length);

                if (extension == ".pdf")
                {
                    return bytesRead >= 5 &&
                        header[0] == 0x25 &&
                        header[1] == 0x50 &&
                        header[2] == 0x44 &&
                        header[3] == 0x46 &&
                        header[4] == 0x2D;
                }

                if (extension == ".doc")
                {
                    byte[] docSignature =
                    {
                        0xD0, 0xCF, 0x11, 0xE0,
                        0xA1, 0xB1, 0x1A, 0xE1
                    };

                    return bytesRead == 8 &&
                        header.SequenceEqual(docSignature);
                }

                if (extension == ".docx")
                {
                    // DOCX files are ZIP archives containing
                    // these required Word document entries.
                    if (bytesRead < 4 ||
                        header[0] != 0x50 ||
                        header[1] != 0x4B)
                    {
                        return false;
                    }

                    stream.Position = 0;

                    using var archive = new ZipArchive(
                        stream,
                        ZipArchiveMode.Read,
                        leaveOpen: true);

                    return archive.GetEntry("[Content_Types].xml") != null &&
                        archive.GetEntry("word/document.xml") != null;
                }

                return false;
            }
            catch (InvalidDataException)
            {
                return false;
            }
            catch (IOException)
            {
                return false;
            }
        }
    }
}
