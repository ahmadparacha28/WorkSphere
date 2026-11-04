
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.DTOs;
using WorkSphere.Api.Models;

namespace WorkSphere.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _context;

    public AttendanceController(AppDbContext context)
    {
        _context = context;
    }

    private static readonly TimeZoneInfo PakistanTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Pakistan Standard Time");

    private static readonly TimeSpan ShiftStart = new(9, 0, 0);
    private static readonly TimeSpan GracePeriod = TimeSpan.FromMinutes(10);

    private static readonly string[] ValidStatuses =
    {
        "Present", "Absent", "Late", "Half-Day"
    };

    private bool IsManager =>
        User.IsInRole("Admin") || User.IsInRole("HR");

    private int? CurrentEmployeeId
    {
        get
        {
            var claim = User.FindFirst("EmployeeId");
            return int.TryParse(claim?.Value, out int id) ? id : null;
        }
    }

    private static DateTime GetPakistanTime()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow, PakistanTimeZone);
    }

    private static DateTime GetPakistanTime(DateTime utcDateTime)
    {
        var utc = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(utc, PakistanTimeZone);
    }

    private static string GetAttendanceStatus(DateTime checkIn)
    {
        var localCheckIn = GetPakistanTime(checkIn);
        var allowedTime = ShiftStart + GracePeriod;

        return localCheckIn.TimeOfDay > allowedTime
            ? "Late"
            : "Present";
    }

    private static bool IsValidStatus(string status)
    {
        return ValidStatuses.Contains(
            status, StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsWorkingDay(DateTime date)
    {
        return date.DayOfWeek != DayOfWeek.Saturday &&
               date.DayOfWeek != DayOfWeek.Sunday;
    }

    // ---------------------------------------------------------
    // MONTHLY REPORT BUILDER
    // ---------------------------------------------------------

    private async Task<List<MonthlyAttendanceReportDto>>
        BuildMonthlyReports(
            int month,
            int year,
            int? employeeId = null,
            int? departmentId = null)
    {
        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var employeeQuery = _context.Employees
            .Include(e => e.Department)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            employeeQuery = employeeQuery.Where(
                e => e.Id == employeeId.Value);
        }

        if (departmentId.HasValue)
        {
            employeeQuery = employeeQuery.Where(
                e => e.DepartmentId == departmentId.Value);
        }

        var employees = await employeeQuery
            .OrderBy(e => e.FirstName)
            .ThenBy(e => e.LastName)
            .ToListAsync();

        var employeeIds = employees.Select(e => e.Id).ToList();

        if (employeeIds.Count == 0)
            return new List<MonthlyAttendanceReportDto>();

        var attendanceRecords = await _context.Attendances
            .Where(a =>
                employeeIds.Contains(a.EmployeeId) &&
                a.Date >= monthStart &&
                a.Date <= monthEnd)
            .ToListAsync();

        var approvedLeaves = await _context.LeaveRequests
            .Where(l =>
                employeeIds.Contains(l.EmployeeId) &&
                l.Status == "Approved" &&
                l.StartDate <= monthEnd &&
                l.EndDate >= monthStart)
            .ToListAsync();

        var workingDates = Enumerable
            .Range(0, monthEnd.Day)
            .Select(day => monthStart.AddDays(day))
            .Where(IsWorkingDay)
            .ToList();

        var reports = new List<MonthlyAttendanceReportDto>();

        foreach (var employee in employees)
        {
            var employeeAttendance = attendanceRecords
                .Where(a => a.EmployeeId == employee.Id)
                .ToDictionary(a => a.Date.Date);

            var employeeLeaves = approvedLeaves
                .Where(l => l.EmployeeId == employee.Id)
                .ToList();

            var leaveDates = new HashSet<DateTime>();

            foreach (var leave in employeeLeaves)
            {
                var start = leave.StartDate.Date < monthStart
                    ? monthStart
                    : leave.StartDate.Date;

                var end = leave.EndDate.Date > monthEnd
                    ? monthEnd
                    : leave.EndDate.Date;

                for (var day = start; day <= end; day = day.AddDays(1))
                {
                    if (IsWorkingDay(day))
                        leaveDates.Add(day);
                }
            }

            // Actual attendance takes precedence over approved leave.
            foreach (var attendance in employeeAttendance.Values)
            {
                leaveDates.Remove(attendance.Date.Date);
            }

            var report = new MonthlyAttendanceReportDto
            {
                EmployeeId = employee.Id,
                EmployeeName = $"{employee.FirstName} {employee.LastName}",
                DepartmentName = employee.Department?.Name ?? "Unassigned",
                Month = month,
                Year = year,
                TotalWorkingDays = workingDates.Count,
                LeaveDays = leaveDates.Count
            };

            foreach (var day in workingDates)
            {
                if (leaveDates.Contains(day))
                {
                    report.Records.Add(new AttendanceReportDayDto
                    {
                        Date = day,
                        Status = "Leave"
                    });

                    continue;
                }

                if (!employeeAttendance.TryGetValue(day, out var record))
                {
                    report.Records.Add(new AttendanceReportDayDto
                    {
                        Date = day,
                        Status = "Not Marked"
                    });

                    continue;
                }

                var recordStatus = record.Status;

                switch (recordStatus.ToLowerInvariant())
                {
                    case "present":
                        report.PresentDays++;
                        break;

                    case "late":
                        report.LateDays++;
                        break;

                    case "absent":
                        report.AbsentDays++;
                        break;

                    case "half-day":
                        report.HalfDays++;
                        break;
                }

                report.Records.Add(new AttendanceReportDayDto
                {
                    Date = day,
                    Status = recordStatus,
                    CheckIn = record.CheckIn,
                    CheckOut = record.CheckOut,
                    Notes = record.Notes
                });
            }

            var expectedWorkingDays =
                report.TotalWorkingDays - report.LeaveDays;

            var attendanceScore =
                report.PresentDays +
                report.LateDays +
                (report.HalfDays * 0.5);

            report.AttendancePercentage = expectedWorkingDays > 0
                ? Math.Round(
                    attendanceScore / expectedWorkingDays * 100, 2)
                : 0;

            reports.Add(report);
        }

        return reports;
    }

    private bool IsValidReportPeriod(int month, int year)
    {
        return month >= 1 && month <= 12 &&
               year >= 2000 && year <= 2100;
    }

    // ---------------------------------------------------------
    // EXISTING ATTENDANCE ENDPOINTS
    // ---------------------------------------------------------

    // GET: api/Attendance
    [HttpGet]
    public async Task<IActionResult> GetAttendance(
        [FromQuery] DateTime? date,
        [FromQuery] int? employeeId,
        [FromQuery] string? status)
    {
        var query = _context.Attendances
            .Include(a => a.Employee)
            .AsQueryable();

        if (!IsManager)
        {
            if (!CurrentEmployeeId.HasValue)
                return Forbid();

            query = query.Where(
                a => a.EmployeeId == CurrentEmployeeId.Value);
        }
        else if (employeeId.HasValue)
        {
            query = query.Where(
                a => a.EmployeeId == employeeId.Value);
        }

        if (date.HasValue)
        {
            var selectedDate = date.Value.Date;
            query = query.Where(a => a.Date == selectedDate);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(a => a.Status == status);
        }

        var records = await query
            .OrderByDescending(a => a.Date)
            .Select(a => new
            {
                a.Id,
                a.EmployeeId,
                EmployeeName = a.Employee!.FirstName + " " +
                               a.Employee.LastName,
                a.Date,
                a.CheckIn,
                a.CheckOut,
                a.Status,
                a.Notes
            })
            .ToListAsync();

        return Ok(records);
    }

    // GET: api/Attendance/my
    [HttpGet("my")]
    public async Task<IActionResult> GetMyAttendance()
    {
        if (!CurrentEmployeeId.HasValue)
            return Forbid();

        var records = await _context.Attendances
            .Where(a => a.EmployeeId == CurrentEmployeeId.Value)
            .OrderByDescending(a => a.Date)
            .Select(a => new
            {
                a.Id,
                a.Date,
                a.CheckIn,
                a.CheckOut,
                a.Status,
                a.Notes
            })
            .ToListAsync();

        return Ok(records);
    }

    // POST: api/Attendance/check-in
    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn(AttendanceCheckInDto dto)
    {
        if (!CurrentEmployeeId.HasValue)
            return Forbid();

        var employeeId = CurrentEmployeeId.Value;
        var today = GetPakistanTime().Date;
        var utcNow = DateTime.UtcNow;

        var existing = await _context.Attendances
            .FirstOrDefaultAsync(a =>
                a.EmployeeId == employeeId && a.Date == today);

        if (existing != null)
            return BadRequest("You have already checked in today.");

        var status = GetAttendanceStatus(utcNow);

        var attendance = new Attendance
        {
            EmployeeId = employeeId,
            Date = today,
            CheckIn = utcNow,
            Status = status,
            Notes = dto.Notes
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = status == "Late"
                ? "Check-in successful. You are marked Late."
                : "Check-in successful. You are marked Present.",
            attendance.Id,
            attendance.Date,
            attendance.CheckIn,
            attendance.Status
        });
    }

    // PUT: api/Attendance/check-out
    [HttpPut("check-out")]
    public async Task<IActionResult> CheckOut()
    {
        if (!CurrentEmployeeId.HasValue)
            return Forbid();

        var employeeId = CurrentEmployeeId.Value;
        var today = GetPakistanTime().Date;
        var utcNow = DateTime.UtcNow;

        var attendance = await _context.Attendances
            .FirstOrDefaultAsync(a =>
                a.EmployeeId == employeeId && a.Date == today);

        if (attendance == null)
            return BadRequest("You must check in before checking out.");

        if (attendance.CheckOut.HasValue)
            return BadRequest("You have already checked out today.");

        if (attendance.CheckIn.HasValue &&
            utcNow < attendance.CheckIn.Value)
            return BadRequest("Invalid check-out time.");

        attendance.CheckOut = utcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Check-out successful.",
            attendance.Id,
            attendance.CheckOut
        });
    }

    // GET: api/Attendance/today
    [HttpGet("today")]
    public async Task<IActionResult> GetTodayAttendance()
    {
        if (!IsManager)
            return Forbid();

        var today = GetPakistanTime().Date;

        var records = await _context.Attendances
            .Where(a => a.Date == today)
            .Include(a => a.Employee)
            .Select(a => new
            {
                a.Id,
                a.EmployeeId,
                EmployeeName = a.Employee!.FirstName + " " +
                               a.Employee.LastName,
                a.CheckIn,
                a.CheckOut,
                a.Status
            })
            .ToListAsync();

        return Ok(records);
    }

    // POST: api/Attendance
    [HttpPost]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> CreateAttendance(
        AttendanceUpdateDto dto)
    {
        if (!IsValidStatus(dto.Status))
            return BadRequest("Invalid attendance status.");

        var employeeExists = await _context.Employees
            .AnyAsync(e => e.Id == dto.EmployeeId);

        if (!employeeExists)
            return BadRequest("Employee not found.");

        var date = dto.Date.Date;

        var exists = await _context.Attendances
            .AnyAsync(a =>
                a.EmployeeId == dto.EmployeeId && a.Date == date);

        if (exists)
            return BadRequest(
                "Attendance already exists for this employee and date.");

        var status = dto.Status;

        if (status == "Present" && dto.CheckIn.HasValue)
            status = GetAttendanceStatus(dto.CheckIn.Value);

        var attendance = new Attendance
        {
            EmployeeId = dto.EmployeeId,
            Date = date,
            CheckIn = dto.CheckIn,
            CheckOut = dto.CheckOut,
            Status = status,
            Notes = dto.Notes
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Attendance record created successfully.",
            attendance.Id,
            attendance.Status
        });
    }

    // PUT: api/Attendance/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> UpdateAttendance(
        int id,
        AttendanceUpdateDto dto)
    {
        if (!IsValidStatus(dto.Status))
            return BadRequest("Invalid attendance status.");

        var attendance = await _context.Attendances.FindAsync(id);

        if (attendance == null)
            return NotFound("Attendance record not found.");

        var employeeExists = await _context.Employees
            .AnyAsync(e => e.Id == dto.EmployeeId);

        if (!employeeExists)
            return BadRequest("Employee not found.");

        var date = dto.Date.Date;

        var duplicate = await _context.Attendances
            .AnyAsync(a =>
                a.Id != id &&
                a.EmployeeId == dto.EmployeeId &&
                a.Date == date);

        if (duplicate)
            return BadRequest(
                "Another attendance record already exists for this employee and date.");

        var status = dto.Status;

        if (status == "Present" && dto.CheckIn.HasValue)
            status = GetAttendanceStatus(dto.CheckIn.Value);

        attendance.EmployeeId = dto.EmployeeId;
        attendance.Date = date;
        attendance.CheckIn = dto.CheckIn;
        attendance.CheckOut = dto.CheckOut;
        attendance.Status = status;
        attendance.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Attendance updated successfully.",
            attendance.Status
        });
    }

    // DELETE: api/Attendance/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> DeleteAttendance(int id)
    {
        var attendance = await _context.Attendances.FindAsync(id);

        if (attendance == null)
            return NotFound("Attendance record not found.");

        _context.Attendances.Remove(attendance);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Attendance deleted successfully."
        });
    }

    // POST: api/Attendance/mark-absent?date=YYYY-MM-DD
    [HttpPost("mark-absent")]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> MarkAbsent(
        [FromQuery] DateTime? date)
    {
        var selectedDate = date?.Date ?? GetPakistanTime().Date;

        if (selectedDate > GetPakistanTime().Date)
            return BadRequest(
                "You cannot mark employees absent for a future date.");

        var employees = await _context.Employees
            .Select(e => e.Id)
            .ToListAsync();

        var existingIds = (await _context.Attendances
            .Where(a => a.Date == selectedDate)
            .Select(a => a.EmployeeId)
            .ToListAsync()).ToHashSet();

        var absentRecords = employees
            .Where(id => !existingIds.Contains(id))
            .Select(id => new Attendance
            {
                EmployeeId = id,
                Date = selectedDate,
                Status = "Absent",
                Notes = "Automatically marked absent by Admin/HR."
            })
            .ToList();

        if (absentRecords.Count == 0)
        {
            return Ok(new
            {
                Message = "All employees already have attendance records for this date.",
                Date = selectedDate,
                AbsentCount = 0
            });
        }

        _context.Attendances.AddRange(absentRecords);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Missing attendance records marked as Absent successfully.",
            Date = selectedDate,
            AbsentCount = absentRecords.Count
        });
    }

    // GET: api/Attendance/summary?employeeId=1
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? employeeId)
    {
        int selectedEmployeeId;

        if (IsManager)
        {
            if (!employeeId.HasValue)
                return BadRequest("Employee ID is required.");

            selectedEmployeeId = employeeId.Value;
        }
        else
        {
            if (!CurrentEmployeeId.HasValue)
                return Forbid();

            selectedEmployeeId = CurrentEmployeeId.Value;
        }

        var records = await _context.Attendances
            .Where(a => a.EmployeeId == selectedEmployeeId)
            .ToListAsync();

        return Ok(new
        {
            TotalDays = records.Count,
            Present = records.Count(a => a.Status == "Present"),
            Absent = records.Count(a => a.Status == "Absent"),
            Late = records.Count(a => a.Status == "Late"),
            HalfDay = records.Count(a => a.Status == "Half-Day")
        });
    }

    // ---------------------------------------------------------
    // NEW MONTHLY REPORT ENDPOINTS
    // ---------------------------------------------------------

    // GET: api/Attendance/reports/monthly?month=11&year=2026
    // Optional: employeeId=1 or departmentId=2
    [HttpGet("reports/monthly")]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> GetMonthlyReports(
        [FromQuery] int month,
        [FromQuery] int year,
        [FromQuery] int? employeeId,
        [FromQuery] int? departmentId)
    {
        if (!IsValidReportPeriod(month, year))
            return BadRequest("Please provide a valid month and year.");

        var reports = await BuildMonthlyReports(
            month, year, employeeId, departmentId);

        return Ok(reports);
    }

    // GET: api/Attendance/reports/departments?month=11&year=2026
    [HttpGet("reports/departments")]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> GetDepartmentReports(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        if (!IsValidReportPeriod(month, year))
            return BadRequest("Please provide a valid month and year.");

        var reports = await BuildMonthlyReports(month, year);

        var result = reports
            .GroupBy(r => r.DepartmentName)
            .Select(group => new
            {
                DepartmentName = group.Key,
                EmployeeCount = group.Count(),
                TotalWorkingDays = group.Sum(r => r.TotalWorkingDays),
                PresentDays = group.Sum(r => r.PresentDays),
                LateDays = group.Sum(r => r.LateDays),
                AbsentDays = group.Sum(r => r.AbsentDays),
                HalfDays = group.Sum(r => r.HalfDays),
                LeaveDays = group.Sum(r => r.LeaveDays),
                AverageAttendancePercentage =
                    group.Count() > 0
                        ? Math.Round(
                            group.Average(r => r.AttendancePercentage), 2)
                        : 0
            })
            .OrderBy(r => r.DepartmentName)
            .ToList();

        return Ok(result);
    }

    // GET: api/Attendance/reports/export?month=11&year=2026
    // Optional: employeeId and departmentId
    [HttpGet("reports/export")]
    [Authorize(Roles = "Admin,HR")]
    public async Task<IActionResult> ExportMonthlyReport(
        [FromQuery] int month,
        [FromQuery] int year,
        [FromQuery] int? employeeId,
        [FromQuery] int? departmentId)
    {
        if (!IsValidReportPeriod(month, year))
            return BadRequest("Please provide a valid month and year.");

        var reports = await BuildMonthlyReports(
            month, year, employeeId, departmentId);

        var csv = new StringBuilder();

        // UTF-8 BOM helps Microsoft Excel recognize UTF-8 correctly.
        csv.AppendLine(
            "Employee ID,Employee Name,Department,Month,Year," +
            "Working Days,Present,Late,Absent,Half Days,Leave Days," +
            "Attendance Percentage");

        foreach (var report in reports)
        {
            csv.AppendLine(string.Join(",",
                Csv(report.EmployeeId.ToString()),
                Csv(report.EmployeeName),
                Csv(report.DepartmentName),
                Csv(report.Month.ToString()),
                Csv(report.Year.ToString()),
                Csv(report.TotalWorkingDays.ToString()),
                Csv(report.PresentDays.ToString()),
                Csv(report.LateDays.ToString()),
                Csv(report.AbsentDays.ToString()),
                Csv(report.HalfDays.ToString()),
                Csv(report.LeaveDays.ToString()),
                Csv(report.AttendancePercentage.ToString("0.00"))
            ));
        }

        var bytes = Encoding.UTF8.GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(csv.ToString()))
            .ToArray();

        var fileName = $"WorkSphere_Attendance_{year}_{month:D2}.csv";

        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private static string Csv(string? value)
    {
        value ??= string.Empty;

        // Prevent spreadsheet formula injection.
        if (value.Length > 0 &&
            (value[0] == '=' || value[0] == '+' ||
             value[0] == '-' || value[0] == '@'))
        {
            value = "'" + value;
        }

        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
