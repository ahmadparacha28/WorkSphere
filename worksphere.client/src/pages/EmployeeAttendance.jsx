import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  RefreshCw
} from "lucide-react";

import api from "../services/api";
import "./EmployeeAttendance.css";

function getToday() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function EmployeeAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const todayRecord = records.find(
    (record) => record.date?.substring(0, 10) === getToday()
  );

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/Attendance/my");

      setRecords(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Attendance loading error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load your attendance."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const checkIn = async () => {
    try {
      setSaving(true);
      setError("");
      setNotice("");

      await api.post("/Attendance/check-in", {});

      setNotice("You have successfully checked in.");
      await loadAttendance();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to check in."
      );
    } finally {
      setSaving(false);
    }
  };

  const checkOut = async () => {
    try {
      setSaving(true);
      setError("");
      setNotice("");

      await api.put("/Attendance/check-out");

      setNotice("You have successfully checked out.");
      await loadAttendance();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to check out."
      );
    } finally {
      setSaving(false);
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
    if (!value) return "—";

    return new Date(`${value.substring(0, 10)}T00:00:00`)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
  };

  const present = records.filter(
    (record) => record.status === "Present"
  ).length;

  const late = records.filter(
    (record) => record.status === "Late"
  ).length;

  const absent = records.filter(
    (record) => record.status === "Absent"
  ).length;

  return (
    <div className="employee-attendance">
      <div className="employee-attendance-heading">
        <div>
          <span>EMPLOYEE WORKSPACE</span>
          <h1>My Attendance</h1>
          <p>Track your daily working hours and attendance history.</p>
        </div>

        <button
          onClick={loadAttendance}
          disabled={loading}
          className="employee-attendance-refresh"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="employee-attendance-alert error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {notice && (
        <div className="employee-attendance-alert success">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}

      <section className="employee-attendance-today">
        <div className="employee-attendance-today-heading">
          <div>
            <span>TODAY'S ATTENDANCE</span>
            <h2>{new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric"
            })}</h2>
          </div>

          <CalendarCheck size={30} />
        </div>

        <div className="employee-attendance-times">
          <div>
            <span>Check In</span>
            <strong>
              {todayRecord?.checkIn
                ? formatTime(todayRecord.checkIn)
                : "Not checked in"}
            </strong>
          </div>

          <div>
            <span>Check Out</span>
            <strong>
              {todayRecord?.checkOut
                ? formatTime(todayRecord.checkOut)
                : "Not checked out"}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              {todayRecord?.status || "Not marked"}
            </strong>
          </div>
        </div>

        <div className="employee-attendance-actions">
          <button
            className="employee-check-in"
            onClick={checkIn}
            disabled={
              loading ||
              saving ||
              Boolean(todayRecord)
            }
          >
            <LogIn size={18} />
            {saving ? "Processing..." : "Check In"}
          </button>

          <button
            className="employee-check-out"
            onClick={checkOut}
            disabled={
              loading ||
              saving ||
              !todayRecord?.checkIn ||
              Boolean(todayRecord?.checkOut)
            }
          >
            <LogOut size={18} />
            Check Out
          </button>
        </div>

        {todayRecord?.checkOut && (
          <p className="employee-attendance-complete">
            Your attendance for today is complete.
          </p>
        )}
      </section>

      <div className="employee-attendance-stats">
        <div>
          <CheckCircle size={22} />
          <span>Present</span>
          <strong>{loading ? "—" : present}</strong>
        </div>

        <div>
          <Clock size={22} />
          <span>Late</span>
          <strong>{loading ? "—" : late}</strong>
        </div>

        <div>
          <XCircle size={22} />
          <span>Absent</span>
          <strong>{loading ? "—" : absent}</strong>
        </div>
      </div>

      <section className="employee-attendance-history">
        <div>
          <h2>Attendance History</h2>
          <p>Your previous attendance records.</p>
        </div>

        {loading ? (
          <p className="employee-attendance-empty">Loading records...</p>
        ) : records.length === 0 ? (
          <p className="employee-attendance-empty">
            No attendance records found.
          </p>
        ) : (
          <div className="employee-attendance-table-scroll">
            <table>
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
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{formatTime(record.checkIn)}</td>
                    <td>{formatTime(record.checkOut)}</td>
                    <td>
                      <span className={`employee-attendance-status ${record.status?.toLowerCase().replace("-", "")}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default EmployeeAttendance;