
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet, Printer, RefreshCw, Search,
  CalendarDays, Users, CheckCircle, Clock,
  XCircle, CalendarCheck, ChevronDown, ChevronUp
} from "lucide-react";
import api from "../services/api";
import "./AttendanceReports.css";

const currentDate = new Date();

const getMonthName = (month) =>
  new Date(2000, month - 1, 1).toLocaleString("en-US", {
    month: "long"
  });

const getList = (data) => {
  if (Array.isArray(data)) return data;
  return data?.items || data?.employees ||
    data?.departments || data?.data || [];
};

const getErrorMessage = (err) => {
  const data = err.response?.data;

  if (typeof data === "string") return data;
  return data?.message || data?.title ||
    "Unable to load attendance reports.";
};

function AttendanceReports() {
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");

  const [reports, setReports] = useState([]);
  const [departmentReports, setDepartmentReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        month,
        year,
        ...(employeeId ? { employeeId } : {}),
        ...(departmentId ? { departmentId } : {})
      };

      const [monthlyResponse, departmentResponse] = await Promise.all([
        api.get("/Attendance/reports/monthly", { params }),
        api.get("/Attendance/reports/departments", {
          params: { month, year }
        })
      ]);

      setReports(Array.isArray(monthlyResponse.data)
        ? monthlyResponse.data : []);

      setDepartmentReports(Array.isArray(departmentResponse.data)
        ? departmentResponse.data : []);

      setExpandedEmployee(null);
    } catch (err) {
      console.error("Attendance report error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month, year, employeeId, departmentId]);

  const loadOptions = useCallback(async () => {
    try {
      const [employeeResponse, departmentResponse] = await Promise.all([
        api.get("/Employee?page=1&pageSize=100"),
        api.get("/Department")
      ]);

      setEmployees(getList(employeeResponse.data));
      setDepartments(getList(departmentResponse.data));
    } catch (err) {
      console.error("Report filter loading error:", err);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) =>
      !search ||
      report.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      report.departmentName?.toLowerCase().includes(search.toLowerCase()) ||
      String(report.employeeId).includes(search)
    );
  }, [reports, search]);

  const totals = useMemo(() => {
    const result = filteredReports.reduce((acc, report) => {
      acc.employees++;
      acc.workingDays += report.totalWorkingDays || 0;
      acc.present += report.presentDays || 0;
      acc.late += report.lateDays || 0;
      acc.absent += report.absentDays || 0;
      acc.halfDays += report.halfDays || 0;
      acc.leave += report.leaveDays || 0;
      acc.percentage += report.attendancePercentage || 0;
      return acc;
    }, {
      employees: 0,
      workingDays: 0,
      present: 0,
      late: 0,
      absent: 0,
      halfDays: 0,
      leave: 0,
      percentage: 0
    });

    result.averagePercentage = result.employees
      ? Number((result.percentage / result.employees).toFixed(2))
      : 0;

    return result;
  }, [filteredReports]);

  const exportReport = async () => {
    try {
      setExporting(true);
      setError("");

      const response = await api.get("/Attendance/reports/export", {
        params: {
          month,
          year,
          ...(employeeId ? { employeeId } : {}),
          ...(departmentId ? { departmentId } : {})
        },
        responseType: "blob"
      });

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;"
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `WorkSphere_Attendance_${year}_${String(month).padStart(2, "0")}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Attendance export error:", err);
      setError("Unable to export the attendance report.");
    } finally {
      setExporting(false);
    }
  };

  const formatTime = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDate = (value) => {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const clearFilters = () => {
    setEmployeeId("");
    setDepartmentId("");
    setSearch("");
  };

  return (
    <div className="attendance-reports-page">

      <div className="ar-heading">
        <div>
          <span className="ar-eyebrow">WORKFORCE ANALYTICS</span>
          <h2>Attendance Reports</h2>
          <p>Monthly attendance performance and employee insights.</p>
        </div>

        <div className="ar-heading-actions">
          <button
            className="ar-button ar-secondary"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="ar-button ar-secondary"
            onClick={() => window.print()}
          >
            <Printer size={17} />
            Print
          </button>

          <button
            className="ar-button ar-primary"
            onClick={exportReport}
            disabled={exporting || loading}
          >
            <FileSpreadsheet size={17} />
            {exporting ? "Exporting..." : "Export Excel CSV"}
          </button>
        </div>
      </div>

      {error && (
        <div className="ar-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <section className="ar-filter-panel">
        <div className="ar-filter-title">
          <CalendarDays size={19} />
          <div>
            <h3>Report Filters</h3>
            <p>Select a reporting period and employee group.</p>
          </div>
        </div>

        <div className="ar-filters">
          <label>
            Month
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
          </label>

          <label>
            Year
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from(
                { length: 7 },
                (_, i) => currentDate.getFullYear() - 3 + i
              ).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <label>
            Department
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Employee
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="ar-report-period">
        <span>
          Report period: <strong>{getMonthName(month)} {year}</strong>
        </span>
        <span>{filteredReports.length} employees included</span>
      </div>

      <section className="ar-stat-grid">
        <div className="ar-stat-card">
          <div className="ar-stat-icon blue"><Users size={22} /></div>
          <div>
            <span>Employees</span>
            <h3>{loading ? "—" : totals.employees}</h3>
          </div>
        </div>

        <div className="ar-stat-card">
          <div className="ar-stat-icon green"><CheckCircle size={22} /></div>
          <div>
            <span>Present</span>
            <h3>{loading ? "—" : totals.present}</h3>
          </div>
        </div>

        <div className="ar-stat-card">
          <div className="ar-stat-icon orange"><Clock size={22} /></div>
          <div>
            <span>Late</span>
            <h3>{loading ? "—" : totals.late}</h3>
          </div>
        </div>

        <div className="ar-stat-card">
          <div className="ar-stat-icon red"><XCircle size={22} /></div>
          <div>
            <span>Absent</span>
            <h3>{loading ? "—" : totals.absent}</h3>
          </div>
        </div>

        <div className="ar-stat-card">
          <div className="ar-stat-icon purple"><CalendarCheck size={22} /></div>
          <div>
            <span>Approved Leave</span>
            <h3>{loading ? "—" : totals.leave}</h3>
          </div>
        </div>

        <div className="ar-stat-card">
          <div className="ar-stat-icon teal"><CheckCircle size={22} /></div>
          <div>
            <span>Average Attendance</span>
            <h3>{loading ? "—" : `${totals.averagePercentage}%`}</h3>
          </div>
        </div>
      </section>

      <section className="ar-panel">
        <div className="ar-panel-heading">
          <div>
            <h3>Department Performance</h3>
            <p>Attendance statistics grouped by department.</p>
          </div>
        </div>

        {loading ? (
          <div className="ar-empty">Loading department reports...</div>
        ) : departmentReports.length === 0 ? (
          <div className="ar-empty">No department data available.</div>
        ) : (
          <div className="ar-table-scroll">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Employees</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                  <th>Leave</th>
                  <th>Average Attendance</th>
                </tr>
              </thead>
              <tbody>
                {departmentReports.map((department) => (
                  <tr key={department.departmentName}>
                    <td><strong>{department.departmentName}</strong></td>
                    <td>{department.employeeCount}</td>
                    <td>{department.presentDays}</td>
                    <td>{department.lateDays}</td>
                    <td>{department.absentDays}</td>
                    <td>{department.leaveDays}</td>
                    <td>
                      <div className="ar-percentage">
                        <div className="ar-progress">
                          <span style={{
                            width: `${Math.min(
                              department.averageAttendancePercentage || 0,
                              100
                            )}%`
                          }} />
                        </div>
                        <strong>
                          {department.averageAttendancePercentage}%
                        </strong>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ar-panel">
        <div className="ar-panel-heading ar-employee-heading">
          <div>
            <h3>Employee Monthly Reports</h3>
            <p>Expand an employee to view daily attendance details.</p>
          </div>

          <div className="ar-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
            />
          </div>
        </div>

        {loading ? (
          <div className="ar-empty">Loading employee reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="ar-empty">
            No employee reports found for the selected filters.
          </div>
        ) : (
          <div className="ar-table-scroll">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Working Days</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                  <th>Half Days</th>
                  <th>Leave</th>
                  <th>Attendance</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((report) => (
                  <Fragment key={report.employeeId}>
                    <tr key={report.employeeId}>
                      <td>
                        <strong>{report.employeeName}</strong>
                        <small className="ar-subtext">
                          ID: {report.employeeId}
                        </small>
                      </td>
                      <td>{report.departmentName}</td>
                      <td>{report.totalWorkingDays}</td>
                      <td>{report.presentDays}</td>
                      <td>{report.lateDays}</td>
                      <td>{report.absentDays}</td>
                      <td>{report.halfDays}</td>
                      <td>{report.leaveDays}</td>
                      <td>
                        <span className="ar-percentage-value">
                          {report.attendancePercentage}%
                        </span>
                      </td>
                      <td>
                        <button
                          className="ar-expand-button"
                          onClick={() => setExpandedEmployee(
                            expandedEmployee === report.employeeId
                              ? null
                              : report.employeeId
                          )}
                        >
                          {expandedEmployee === report.employeeId
                            ? <ChevronUp size={18} />
                            : <ChevronDown size={18} />}
                        </button>
                      </td>
                    </tr>

                    {expandedEmployee === report.employeeId && (
                      <tr key={`${report.employeeId}-details`}>
                        <td colSpan="10" className="ar-details-cell">
                          <div className="ar-details">
                            <h4>Daily Attendance — {report.employeeName}</h4>

                            <table className="ar-detail-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Check In</th>
                                  <th>Check Out</th>
                                  <th>Status</th>
                                  <th>Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.records?.map((record) => (
                                  <tr key={record.date}>
                                    <td>{formatDate(record.date)}</td>
                                    <td>{formatTime(record.checkIn)}</td>
                                    <td>{formatTime(record.checkOut)}</td>
                                    <td>
                                      <span className={`ar-status ${record.status
                                        ?.toLowerCase().replace(/\s+/g, "-")}`}>
                                        {record.status}
                                      </span>
                                    </td>
                                    <td>{record.notes || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="ar-footer">
        <span>
          <CalendarDays size={15} />
          {getMonthName(month)} {year}
        </span>
        <span>Generated by WorkSphere Attendance Reports</span>
      </div>
    </div>
  );
}

export default AttendanceReports;
