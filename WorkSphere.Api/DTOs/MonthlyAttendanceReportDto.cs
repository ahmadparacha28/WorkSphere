
namespace WorkSphere.Api.DTOs;

public class MonthlyAttendanceReportDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;

    public int Month { get; set; }
    public int Year { get; set; }

    public int TotalWorkingDays { get; set; }
    public int PresentDays { get; set; }
    public int LateDays { get; set; }
    public int AbsentDays { get; set; }
    public int HalfDays { get; set; }
    public int LeaveDays { get; set; }

    public double AttendancePercentage { get; set; }

    public List<AttendanceReportDayDto> Records { get; set; } = new();
}

public class AttendanceReportDayDto
{
    public DateTime Date { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public string? Notes { get; set; }
}
