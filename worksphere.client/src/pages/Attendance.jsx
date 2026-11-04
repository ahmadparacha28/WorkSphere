
import { useCallback, useEffect, useState } from "react";
import {
  Users, Clock, CheckCircle, XCircle, RefreshCw,
  Trash2, Search, Plus, Pencil, X, CalendarCheck
} from "lucide-react";

import api from "../services/api";
import "./Attendance.css";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyForm = {
  employeeId: "",
  date: today(),
  checkIn: "",
  checkOut: "",
  status: "Present",
  notes: ""
};

function toDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 16);
}

function getErrorMessage(err, fallback) {
  const data = err.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;

  return fallback;
}

function Attendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingAbsent, setMarkingAbsent] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [attendanceResponse, employeeResponse] = await Promise.all([
        api.get("/Attendance"),
        api.get("/Employee?page=1&pageSize=100")
      ]);

      const employeeData = employeeResponse.data;

      setRecords(
        Array.isArray(attendanceResponse.data)
          ? attendanceResponse.data
          : []
      );

      setEmployees(
        Array.isArray(employeeData)
          ? employeeData
          : employeeData?.items ||
            employeeData?.employees ||
            employeeData?.data ||
            []
      );
    } catch (err) {
      console.error("Attendance loading error:", err);
      setError(
        getErrorMessage(err, "Unable to load attendance records.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark employees without attendance records as Absent
  const markAbsentees = async () => {
    const selectedDate = date || today();

    if (selectedDate > today()) {
      setError("You cannot mark employees absent for a future date.");
      return;
    }

    const confirmed = window.confirm(
      `Mark all employees without attendance records as Absent for ${selectedDate}?`
    );

    if (!confirmed) return;

    try {
      setMarkingAbsent(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        `/Attendance/mark-absent?date=${selectedDate}`
      );

      const message =
        response.data?.message ||
        "Absent records processed successfully.";

      const count = response.data?.absentCount ?? 0;

      setSuccess(`${message} Employees marked absent: ${count}.`);

      await loadData();
    } catch (err) {
      console.error("Mark absent error:", err);
      setError(
        getErrorMessage(err, "Unable to mark employees absent.")
      );
    } finally {
      setMarkingAbsent(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesDate =
      !date || record.date?.substring(0, 10) === date;

    const matchesStatus =
      !status || record.status === status;

    const matchesEmployee =
      !employeeId || String(record.employeeId) === employeeId;

    const matchesSearch =
      !search ||
      record.employeeName?.toLowerCase().includes(search.toLowerCase());

    return matchesDate && matchesStatus && matchesEmployee && matchesSearch;
  });

  const stats = {
    total: filteredRecords.length,
    present: filteredRecords.filter((r) => r.status === "Present").length,
    late: filteredRecords.filter((r) => r.status === "Late").length,
    absent: filteredRecords.filter((r) => r.status === "Absent").length
  };

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatTime = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: today() });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingId(record.id);

    setForm({
      employeeId: String(record.employeeId),
      date: record.date?.substring(0, 10) || today(),
      checkIn: toDateTimeInput(record.checkIn),
      checkOut: toDateTimeInput(record.checkOut),
      status: record.status || "Present",
      notes: record.notes || ""
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const saveAttendance = async (event) => {
    event.preventDefault();

    if (!form.employeeId) {
      setError("Please select an employee.");
      return;
    }

    if (
      form.checkIn &&
      form.checkOut &&
      new Date(form.checkOut) < new Date(form.checkIn)
    ) {
      setError("Check-out cannot be earlier than check-in.");
      return;
    }

    const payload = {
      employeeId: Number(form.employeeId),
      date: `${form.date}T00:00:00`,
      checkIn: form.checkIn
        ? new Date(form.checkIn).toISOString()
        : null,
      checkOut: form.checkOut
        ? new Date(form.checkOut).toISOString()
        : null,
      status: form.status,
      notes: form.notes.trim() || null
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId) {
        await api.put(`/Attendance/${editingId}`, payload);
        setSuccess("Attendance record updated successfully.");
      } else {
        await api.post("/Attendance", payload);
        setSuccess("Attendance record created successfully.");
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Attendance save error:", err);
      setError(
        getErrorMessage(err, "Unable to save attendance record.")
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Delete this attendance record?")) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/Attendance/${id}`);

      setSuccess("Attendance record deleted successfully.");

      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to delete attendance record.")
      );
    }
  };

  return (
    <div className="attendance-page">

      {/* Page heading */}
      <div className="attendance-page-heading">
        <div>
          <span className="attendance-eyebrow">
            WORKFORCE MANAGEMENT
          </span>

          <h2>Attendance Management</h2>

          <p>Monitor and manage employee attendance records.</p>
        </div>

        <div className="attendance-heading-actions">

          <button
            className="attendance-refresh"
            onClick={loadData}
            disabled={loading || markingAbsent}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="attendance-mark-absent"
            onClick={markAbsentees}
            disabled={loading || markingAbsent}
          >
            <CalendarCheck size={17} />
            {markingAbsent ? "Processing..." : "Mark Absentees"}
          </button>

          <button
            className="attendance-add"
            onClick={openAddModal}
          >
            <Plus size={17} />
            Add Attendance
          </button>

        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="attendance-error">
          {error}

          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="attendance-success">
          {success}

          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {/* Statistics */}
      <div className="attendance-stats">

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon blue">
            <Users size={22} />
          </div>

          <div>
            <span>Total Records</span>
            <h3>{loading ? "—" : stats.total}</h3>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon green">
            <CheckCircle size={22} />
          </div>

          <div>
            <span>Present</span>
            <h3>{loading ? "—" : stats.present}</h3>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon orange">
            <Clock size={22} />
          </div>

          <div>
            <span>Late</span>
            <h3>{loading ? "—" : stats.late}</h3>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon red">
            <XCircle size={22} />
          </div>

          <div>
            <span>Absent</span>
            <h3>{loading ? "—" : stats.absent}</h3>
          </div>
        </div>

      </div>

      {/* Attendance table */}
      <section className="attendance-panel">

        <div className="attendance-panel-heading">
          <div>
            <h3>Attendance Records</h3>
            <p>Search and filter employee attendance.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="attendance-filters">

          <div className="attendance-search">
            <Search size={17} />

            <input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Filter by date"
          />

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

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
            <option value="Half-Day">Half-Day</option>
          </select>

          <button
            className="attendance-clear"
            onClick={() => {
              setDate("");
              setStatus("");
              setEmployeeId("");
              setSearch("");
            }}
          >
            Clear
          </button>

        </div>

        {/* Table content */}
        {loading ? (
          <div className="attendance-empty">
            Loading attendance records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="attendance-empty">
            <CalendarCheck size={38} />

            <h3>No attendance records found</h3>

            <p>
              Try changing your filters or add an attendance record.
            </p>
          </div>
        ) : (
          <div className="attendance-table-scroll">

            <table className="attendance-table">

              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>

                    <td>
                      <strong>
                        {record.employeeName || "Unknown"}
                      </strong>

                      <small>ID: {record.employeeId}</small>
                    </td>

                    <td>{formatDate(record.date)}</td>

                    <td>{formatTime(record.checkIn)}</td>

                    <td>{formatTime(record.checkOut)}</td>

                    <td>
                      <span
                        className={`attendance-status ${record.status?.toLowerCase().replace("-", "")}`}
                      >
                        {record.status}
                      </span>
                    </td>

                    <td>{record.notes || "—"}</td>

                    <td>
                      <div className="attendance-row-actions">

                        <button
                          className="attendance-edit"
                          onClick={() => openEditModal(record)}
                          title="Edit record"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          className="attendance-delete"
                          onClick={() => deleteRecord(record.id)}
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

      </section>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="attendance-modal-overlay"
          onClick={() => !saving && setModalOpen(false)}
        >

          <div
            className="attendance-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="attendance-modal-heading">

              <div>
                <h3>
                  {editingId ? "Edit Attendance" : "Add Attendance"}
                </h3>

                <p>Enter the employee's attendance details.</p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={19} />
              </button>

            </div>

            <form onSubmit={saveAttendance}>

              <label>
                Employee

                <select
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select employee</option>

                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Attendance Date

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <div className="attendance-modal-grid">

                <label>
                  Check In

                  <input
                    type="datetime-local"
                    name="checkIn"
                    value={form.checkIn}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  Check Out

                  <input
                    type="datetime-local"
                    name="checkOut"
                    value={form.checkOut}
                    onChange={handleFormChange}
                  />
                </label>

              </div>

              <label>
                Attendance Status

                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  required
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="Half-Day">Half-Day</option>
                </select>
              </label>

              <label>
                Notes

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  maxLength={300}
                  placeholder="Optional notes..."
                />
              </label>

              <div className="attendance-modal-actions">

                <button
                  type="button"
                  className="attendance-modal-cancel"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="attendance-modal-save"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Record"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Attendance;
