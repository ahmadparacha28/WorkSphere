
import { useCallback, useEffect, useState } from "react";
import {
  UserCircle,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  LogOut,
  RefreshCw,
  Trash2,
  Wallet,
  Award
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import EmployeeProfile from "./EmployeeProfile";
import "./EmployeePortal.css";
import NotificationBell from "../components/NotificationBell";
import EmployeeAttendance from "./EmployeeAttendance";
import EmployeePayslips from "./EmployeePayslips";
import EmployeePerformance from "./EmployeePerformance";

const today = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
};

const initialForm = {
  leaveType: "Annual Leave",
  startDate: today(),
  endDate: today(),
  reason: ""
};

function getEmployeeIdFromToken() {
  try {
    const token = localStorage.getItem("worksphere_token");

    if (!token) return null;

    const payloadPart = token.split(".")[1];

    const base64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split("")
          .map((char) =>
            "%" + char.charCodeAt(0).toString(16).padStart(2, "0")
          )
          .join("")
      )
    );

    const value =
      payload.EmployeeId ??
      payload.employeeId ??
      payload["EmployeeId"];

    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : null;
  } catch (error) {
    console.error("Unable to read employee ID from token:", error);
    return null;
  }
}

function EmployeePortal() {
  const { user, logout } = useAuth();

  const [employeeId] = useState(getEmployeeIdFromToken);
  const [leaves, setLeaves] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState("Leaves");

  const getErrorMessage = (err, fallback) => {
    const data = err.response?.data;

    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    if (data?.title) return data.title;

    if (data?.errors) {
      return Object.values(data.errors).flat().join(" ");
    }

    return fallback;
  };

  const loadLeaves = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/Leave/employee/${employeeId}`
      );

      setLeaves(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Employee leave history error:", err);

      setError(
        getErrorMessage(err, "Unable to load your leave history.")
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const pending = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "pending"
  ).length;

  const approved = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "approved"
  ).length;

  const rejected = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "rejected"
  ).length;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const submitLeave = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      setError("Your account is not linked to an employee record.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      await api.post("/Leave", {
        employeeId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim()
      });

      setForm({
        ...initialForm,
        startDate: today(),
        endDate: today()
      });

      setModalOpen(false);
      setNotice("Your leave request has been submitted.");

      await loadLeaves();
    } catch (err) {
      console.error("Leave submission error:", err);

      setError(
        getErrorMessage(err, "Unable to submit your leave request.")
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteLeave = async (leave) => {
    if (leave.status?.toLowerCase() !== "pending") return;

    if (!window.confirm("Delete this pending leave request?")) return;

    try {
      setError("");
      setNotice("");

      await api.delete(`/Leave/${leave.id}`);

      setNotice("Leave request deleted successfully.");

      await loadLeaves();
    } catch (err) {
      console.error("Leave deletion error:", err);

      setError(
        getErrorMessage(err, "Unable to delete this leave request.")
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(`${date.substring(0, 10)}T00:00:00`)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "approved";
      case "rejected":
        return "rejected";
      default:
        return "pending";
    }
  };

  const displayName = user?.fullName || user?.email || "Employee";

  return (
    <div className="employee-portal">

      {/* Header */}
      <header className="employee-portal-header">
        <div className="employee-portal-brand">
          <div className="employee-portal-logo">W</div>

          <div>
            <h2>WorkSphere</h2>
            <span>Employee Portal</span>
          </div>
        </div>

        <div className="employee-portal-account">
          <div className="employee-portal-user">
            <UserCircle size={22} />

            <div>
              <strong>{displayName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <NotificationBell />

          <button
            className="employee-portal-logout"
            onClick={logout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="employee-navigation">
        <button
          className={activeTab === "Leaves" ? "active" : ""}
          onClick={() => {
            setActiveTab("Leaves");
            setError("");
            setNotice("");
          }}
        >
          <CalendarDays size={17} />
          Leave Management
        </button>

        <button
          className={activeTab === "Attendance" ? "active" : ""}
          onClick={() => {
            setActiveTab("Attendance");
            setError("");
            setNotice("");
          }}
        >
          <Clock size={17} />
          My Attendance
        </button>

        <button
          className={activeTab === "Payslips" ? "active" : ""}
          onClick={() => {
            setActiveTab("Payslips");
            setError("");
            setNotice("");
          }}
        >
          <Wallet size={17} />
          My Payslips
        </button>

        <button
          className={activeTab === "Performance" ? "active" : ""}
          onClick={() => {
            setActiveTab("Performance");
            setError("");
            setNotice("");
          }}
        >
        <Award size={17} />
          My Performance
        </button>

        <button
          className={activeTab === "Profile" ? "active" : ""}
          onClick={() => {
            setActiveTab("Profile");
            setError("");
            setNotice("");
          }}
        >
          <UserCircle size={17} />
          My Profile
        </button>
      </nav>

      <main className="employee-portal-content">

        {/* Profile Page */}
        {activeTab === "Profile" && (
          <EmployeeProfile />
        )}

        {activeTab === "Attendance" && (
          <EmployeeAttendance />
        )}

        {activeTab === "Payslips" && (
          <EmployeePayslips />
        )}

        {activeTab === "Performance" && (
          <EmployeePerformance />
        )}

        {/* Leave Management Page */}
        {activeTab === "Leaves" && (
          <>
            {/* Welcome Section */}
            <div className="employee-portal-welcome">
              <div>
                <span className="employee-portal-eyebrow">
                  EMPLOYEE WORKSPACE
                </span>

                <h1>Welcome, {displayName}!</h1>

                <p>
                  Manage your leave applications and track their status.
                </p>
              </div>

              <button
                className="employee-portal-add-btn"
                onClick={() => {
                  setError("");
                  setNotice("");

                  setForm({
                    ...initialForm,
                    startDate: today(),
                    endDate: today()
                  });

                  setModalOpen(true);
                }}
                disabled={!employeeId}
              >
                <Plus size={18} />
                Apply for Leave
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="employee-portal-alert error">
                {error}
                <button onClick={() => setError("")}>×</button>
              </div>
            )}

            {notice && (
              <div className="employee-portal-alert success">
                {notice}
                <button onClick={() => setNotice("")}>×</button>
              </div>
            )}

            {/* Account Linking Warning */}
            {!employeeId && (
              <div className="employee-portal-link-warning">
                <UserCircle size={24} />

                <div>
                  <strong>Your account is not linked yet.</strong>

                  <p>
                    Ask your Admin or HR manager to link your login account
                    with your employee record. Then log out and sign in again.
                  </p>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="employee-portal-stats">

              <div className="employee-portal-stat">
                <div className="employee-portal-stat-icon blue">
                  <CalendarDays size={22} />
                </div>

                <div>
                  <span>Total Requests</span>
                  <h3>{loading ? "—" : leaves.length}</h3>
                </div>
              </div>

              <div className="employee-portal-stat">
                <div className="employee-portal-stat-icon orange">
                  <Clock size={22} />
                </div>

                <div>
                  <span>Pending</span>
                  <h3>{loading ? "—" : pending}</h3>
                </div>
              </div>

              <div className="employee-portal-stat">
                <div className="employee-portal-stat-icon green">
                  <CheckCircle size={22} />
                </div>

                <div>
                  <span>Approved</span>
                  <h3>{loading ? "—" : approved}</h3>
                </div>
              </div>

              <div className="employee-portal-stat">
                <div className="employee-portal-stat-icon red">
                  <XCircle size={22} />
                </div>

                <div>
                  <span>Rejected</span>
                  <h3>{loading ? "—" : rejected}</h3>
                </div>
              </div>

            </div>

            {/* Leave History */}
            <section className="employee-portal-panel">

              <div className="employee-portal-panel-heading">
                <div>
                  <h2>My Leave History</h2>
                  <p>
                    View the status of your leave applications.
                  </p>
                </div>

                <button
                  className="employee-portal-refresh"
                  onClick={loadLeaves}
                  disabled={loading || !employeeId}
                  title="Refresh"
                >
                  <RefreshCw size={17} />
                </button>
              </div>

              {!employeeId ? (
                <div className="employee-portal-empty">
                  Link your account to view your leave history.
                </div>
              ) : loading ? (
                <div className="employee-portal-empty">
                  Loading your leave history...
                </div>
              ) : leaves.length === 0 ? (
                <div className="employee-portal-empty">
                  <CalendarDays size={38} />

                  <h3>No leave requests yet</h3>

                  <p>
                    Your submitted leave applications will appear here.
                  </p>
                </div>
              ) : (
                <div className="employee-portal-table-scroll">
                  <table className="employee-portal-table">

                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {leaves.map((leave) => (
                        <tr key={leave.id}>
                          <td>{leave.leaveType}</td>

                          <td>{formatDate(leave.startDate)}</td>

                          <td>{formatDate(leave.endDate)}</td>

                          <td>
                            <span
                              className="employee-portal-reason"
                              title={leave.reason}
                            >
                              {leave.reason || "—"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`employee-portal-status ${getStatusClass(leave.status)}`}
                            >
                              {leave.status || "Pending"}
                            </span>
                          </td>

                          <td>
                            {leave.status?.toLowerCase() === "pending" ? (
                              <button
                                className="employee-portal-delete"
                                onClick={() => deleteLeave(leave)}
                                title="Delete pending request"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <span className="employee-portal-completed">
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              )}

            </section>
          </>
        )}

      </main>

      {/* Leave Application Modal */}
      {activeTab === "Leaves" && modalOpen && (
        <div
          className="employee-portal-modal-overlay"
          onClick={() => {
            if (!saving) setModalOpen(false);
          }}
        >
          <div
            className="employee-portal-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="employee-portal-modal-heading">
              <div>
                <h2>Apply for Leave</h2>
                <p>
                  Complete the details of your leave application.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitLeave}>

              <div className="employee-portal-form">

                <label>
                  Leave Type

                  <select
                    name="leaveType"
                    value={form.leaveType}
                    onChange={handleChange}
                    required
                  >
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <div className="employee-portal-date-grid">

                  <label>
                    Start Date

                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      min={today()}
                      onChange={handleChange}
                      required
                    />
                  </label>

                  <label>
                    End Date

                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      min={form.startDate || today()}
                      onChange={handleChange}
                      required
                    />
                  </label>

                </div>

                <label>
                  Reason

                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    placeholder="Explain why you need leave..."
                    rows={4}
                    maxLength={500}
                    required
                  />
                </label>

              </div>

              <div className="employee-portal-modal-actions">

                <button
                  type="button"
                  className="employee-portal-cancel"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="employee-portal-submit"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Application"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default EmployeePortal;
