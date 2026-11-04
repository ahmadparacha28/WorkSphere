
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  RefreshCw,
  Check,
  X,
  Trash2,
  Clock,
  Users
} from "lucide-react";

import api from "../services/api";
import "./Leaves.css";

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyForm = {
  employeeId: "",
  leaveType: "Annual Leave",
  startDate: getToday(),
  endDate: getToday(),
  reason: ""
};

function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const getErrorMessage = (err, fallback) => {
    const data = err.response?.data;

    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.join(", ");
    if (data?.errors) {
      return Object.values(data.errors).flat().join(" ");
    }
    if (data?.message) return data.message;
    if (data?.title) return data.title;

    return fallback;
  };

  
const loadData = useCallback(async () => {
  try {
    setLoading(true);
    setError("");

    // Load leave requests independently
    try {
      const leaveResponse = await api.get("/Leave");

      setLeaves(
        Array.isArray(leaveResponse.data)
          ? leaveResponse.data
          : []
      );
    } catch (err) {
      console.error("Leave loading error:", err);
      setLeaves([]);
      setError(
        err.response?.data?.message ||
        err.response?.data?.title ||
        "Unable to load leave requests."
      );
    }

    // Load the first employee page using valid pagination
    try {
      const firstResponse = await api.get("/Employee", {
        params: {
          page: 1,
          pageSize: 10
        }
      });

      const firstPageData = firstResponse.data?.data || [];
      const totalPages = Math.max(
        1,
        Number(firstResponse.data?.totalPages) || 1
      );

      let allEmployees = [...firstPageData];

      // Fetch remaining employee pages
      if (totalPages > 1) {
        const remainingRequests = [];

        for (let page = 2; page <= totalPages; page++) {
          remainingRequests.push(
            api.get("/Employee", {
              params: {
                page,
                pageSize: 10
              }
            })
          );
        }

        const remainingResponses = await Promise.all(
          remainingRequests
        );

        remainingResponses.forEach((response) => {
          const pageEmployees = response.data?.data || [];
          allEmployees = [...allEmployees, ...pageEmployees];
        });
      }

      setEmployees(allEmployees);

    } catch (err) {
      console.error("Employee loading error:", err);
      setEmployees([]);

      setError(
        err.response?.data?.message ||
        err.response?.data?.title ||
        "Unable to load employees. Check the Employee API."
      );
    }

  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const matchesStatus =
        statusFilter === "All" ||
        leave.status?.toLowerCase() === statusFilter.toLowerCase();

      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        [
          leave.employeeName,
          leave.leaveType,
          leave.reason,
          leave.status
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchText));

      return matchesStatus && matchesSearch;
    });
  }, [leaves, search, statusFilter]);

  const pendingCount = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "pending"
  ).length;

  const approvedCount = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "approved"
  ).length;

  const rejectedCount = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "rejected"
  ).length;

  const openModal = () => {
    setForm({
      ...emptyForm,
      startDate: getToday(),
      endDate: getToday()
    });
    setError("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!form.employeeId) {
      setError("Please select an employee.");
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
        employeeId: Number(form.employeeId),
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim()
      });

      setModalOpen(false);
      setForm(emptyForm);
      setNotice("Leave request created successfully.");

      await loadData();
    } catch (err) {
      console.error("Leave creation error:", err);
      setError(
        getErrorMessage(err, "Unable to create leave request.")
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (leave, status) => {
    const confirmed = window.confirm(
      `Are you sure you want to ${status.toLowerCase()} this leave request?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");

      await api.put(`/Leave/${leave.id}/status`, { status });

      setNotice(`Leave request ${status.toLowerCase()} successfully.`);
      await loadData();
    } catch (err) {
      console.error("Leave status update error:", err);
      setError(
        getErrorMessage(err, "Unable to update leave request.")
      );
    }
  };

  const deleteLeave = async (leave) => {
    if (leave.status?.toLowerCase() !== "pending") {
      setError("Only pending leave requests can be deleted.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this leave request?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");

      await api.delete(`/Leave/${leave.id}`);

      setNotice("Leave request deleted successfully.");
      await loadData();
    } catch (err) {
      console.error("Leave deletion error:", err);
      setError(
        getErrorMessage(err, "Unable to delete leave request.")
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

  return (
    <div className="leaves-page">

      {/* Heading */}
      <div className="leaves-heading">
        <div>
          <h2>Leave Requests</h2>
          <p>Review and manage employee leave applications.</p>
        </div>

        <button className="leave-add-btn" onClick={openModal}>
          <Plus size={18} />
          New Leave Request
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="leave-alert error">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="leave-alert success">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="leave-stats-grid">

        <div className="leave-stat-card">
          <div className="leave-stat-icon blue">
            <CalendarDays size={22} />
          </div>
          <div>
            <span>Total Requests</span>
            <h3>{leaves.length}</h3>
          </div>
        </div>

        <div className="leave-stat-card">
          <div className="leave-stat-icon orange">
            <Clock size={22} />
          </div>
          <div>
            <span>Pending</span>
            <h3>{pendingCount}</h3>
          </div>
        </div>

        <div className="leave-stat-card">
          <div className="leave-stat-icon green">
            <Check size={22} />
          </div>
          <div>
            <span>Approved</span>
            <h3>{approvedCount}</h3>
          </div>
        </div>

        <div className="leave-stat-card">
          <div className="leave-stat-icon red">
            <X size={22} />
          </div>
          <div>
            <span>Rejected</span>
            <h3>{rejectedCount}</h3>
          </div>
        </div>

      </div>

      {/* Filters */}
      <div className="leave-toolbar">

        <div className="leave-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search employee, leave type or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="leave-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <button
          className="leave-refresh-btn"
          onClick={loadData}
          title="Refresh requests"
        >
          <RefreshCw size={17} />
        </button>

      </div>

      {/* Leave table */}
      <div className="leave-table-container">

        {loading ? (
          <div className="leave-empty">Loading leave requests...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="leave-empty">
            <CalendarDays size={40} />
            <h3>No leave requests found</h3>
            <p>There are no requests matching your current filters.</p>
          </div>
        ) : (
          <div className="leave-table-scroll">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeaves.map((leave) => (
                  <tr key={leave.id}>

                    <td>
                      <div className="leave-employee">
                        <div className="leave-employee-avatar">
                          {(leave.employeeName || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong>{leave.employeeName || "Unknown"}</strong>
                          <span>Request #{leave.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>{leave.leaveType}</td>

                    <td>
                      <div className="leave-date-range">
                        <span>{formatDate(leave.startDate)}</span>
                        <span>to {formatDate(leave.endDate)}</span>
                      </div>
                    </td>

                    <td>
                      <span className="leave-reason" title={leave.reason}>
                        {leave.reason || "—"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`leave-status ${getStatusClass(leave.status)}`}
                      >
                        {leave.status || "Pending"}
                      </span>
                    </td>

                    <td>
                      <div className="leave-actions">

                        {leave.status?.toLowerCase() === "pending" && (
                          <>
                            <button
                              className="leave-approve-btn"
                              title="Approve request"
                              onClick={() => updateStatus(leave, "Approved")}
                            >
                              <Check size={16} />
                            </button>

                            <button
                              className="leave-reject-btn"
                              title="Reject request"
                              onClick={() => updateStatus(leave, "Rejected")}
                            >
                              <X size={16} />
                            </button>

                            <button
                              className="leave-delete-btn"
                              title="Delete request"
                              onClick={() => deleteLeave(leave)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}

                        {leave.status?.toLowerCase() !== "pending" && (
                          <span className="leave-no-action">Completed</span>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <div className="leave-results-count">
        Showing {filteredLeaves.length} of {leaves.length} requests
      </div>

      {/* New leave request modal */}
      {modalOpen && (
        <div
          className="leave-modal-overlay"
          onClick={() => {
            if (!saving) setModalOpen(false);
          }}
        >
          <div
            className="leave-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="leave-modal-header">
              <div>
                <h2>New Leave Request</h2>
                <p>Create a leave application for an employee.</p>
              </div>

              <button
                className="leave-close-btn"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>

              <div className="leave-form">

                <label>
                  Select Employee
                  <select
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Choose an employee</option>
                    {employees.length > 0 ? (
                        employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                            </option>
                        ))
) : (
  <option value="" disabled>
    No employees available
  </option>
)}
                  </select>
                </label>

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

                <div className="leave-date-inputs">
                  <label>
                    Start Date
                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleChange}
                      min={getToday()}
                      required
                    />
                  </label>

                  <label>
                    End Date
                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleChange}
                      min={form.startDate || getToday()}
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
                    placeholder="Enter the reason for leave..."
                    rows={4}
                    maxLength={500}
                    required
                  />
                </label>

              </div>

              {error && (
                <div className="leave-alert error">{error}</div>
              )}

              <div className="leave-modal-actions">
                <button
                  type="button"
                  className="leave-cancel-btn"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="leave-submit-btn"
                  disabled={saving || employees.length === 0}
                >
                  {saving ? "Submitting..." : "Submit Request"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Leaves;
