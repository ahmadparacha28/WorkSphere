
import { useEffect, useMemo, useState } from "react";
import {
  UserPlus, UserMinus, ClipboardCheck, Clock, CheckCircle,
  Plus, Search, RefreshCw, X, CalendarDays, Users
} from "lucide-react";
import api from "../services/api";
import "./OnboardingOffboarding.css";

const emptyOnboarding = {
  employeeId: "",
  startDate: new Date().toISOString().slice(0, 10),
  notes: ""
};

const emptyOffboarding = {
  employeeId: "",
  reason: "",
  resignationDate: new Date().toISOString().slice(0, 10),
  lastWorkingDate: "",
  exitInterviewNotes: ""
};

const emptyTask = {
  title: "",
  description: "",
  assignedTo: "HR",
  dueDate: ""
};

function getList(response) {
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.employees)) return data.employees;
  return [];
}

function employeeName(employee) {
  return `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function OnboardingOffboarding() {
  const [activeTab, setActiveTab] = useState("onboarding");
  const [onboardings, setOnboardings] = useState([]);
  const [offboardings, setOffboardings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordForm, setRecordForm] = useState(emptyOnboarding);
  const [taskForm, setTaskForm] = useState(emptyTask);

  const records = activeTab === "onboarding" ? onboardings : offboardings;

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [onboardingRes, offboardingRes, employeeRes] = await Promise.all([
        api.get("/Onboarding"),
        api.get("/Offboarding"),
        api.get("/Employee", {
            params: {
              page: 1,
              pageSize: 100
            }
          })
      ]);

      setOnboardings(getList(onboardingRes));
      setOffboardings(getList(offboardingRes));
      setEmployees(getList(employeeRes));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load onboarding and offboarding data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const name = (record.employeeName || "").toLowerCase();
      const matchesSearch =
        name.includes(search.toLowerCase()) ||
        String(record.employeeId).includes(search) ||
        (record.reason || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const allRecords = [...onboardings, ...offboardings];
  const activeCount = allRecords.filter(r => r.status === "InProgress").length;
  const completedCount = allRecords.filter(r => r.status === "Completed").length;
  const pendingTasks = allRecords.reduce(
    (total, record) => total + (record.tasks || []).filter(t => t.status === "Pending").length,
    0
  );

  const showMessage = text => {
    setMessage(text);
    setError("");
    window.setTimeout(() => setMessage(""), 3500);
  };

  const handleCreateRecord = async event => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (activeTab === "onboarding") {
        await api.post("/Onboarding", {
          ...recordForm,
          employeeId: Number(recordForm.employeeId),
          startDate: new Date(`${recordForm.startDate}T00:00:00`).toISOString()
        });
      } else {
        await api.post("/Offboarding", {
          ...recordForm,
          employeeId: Number(recordForm.employeeId),
          resignationDate: new Date(`${recordForm.resignationDate}T00:00:00`).toISOString(),
          lastWorkingDate: new Date(`${recordForm.lastWorkingDate}T00:00:00`).toISOString()
        });
      }

      setShowRecordForm(false);
      setRecordForm(activeTab === "onboarding" ? emptyOnboarding : emptyOffboarding);
      await loadData();
      showMessage("Record created successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the record.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async event => {
    event.preventDefault();
    if (!selectedRecord) return;

    setSaving(true);
    setError("");

    try {
      const endpoint = activeTab === "onboarding"
        ? `/Onboarding/${selectedRecord.id}/tasks`
        : `/Offboarding/${selectedRecord.id}/tasks`;

      await api.post(endpoint, {
        ...taskForm,
        dueDate: taskForm.dueDate
          ? new Date(`${taskForm.dueDate}T00:00:00`).toISOString()
          : null
      });

      setShowTaskForm(false);
      setTaskForm(emptyTask);
      await loadData();
      showMessage("Task added successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the task.");
    } finally {
      setSaving(false);
    }
  };

  const handleTaskStatus = async (taskId, status) => {
    setError("");

    try {
      const endpoint = activeTab === "onboarding"
        ? `/Onboarding/tasks/${taskId}/status`
        : `/Offboarding/tasks/${taskId}/status`;

      await api.patch(endpoint, { status });
      await loadData();
      showMessage("Task status updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update task status.");
    }
  };

  const handleExitNotes = async record => {
    const notes = window.prompt(
      "Enter exit interview notes:",
      record.exitInterviewNotes || ""
    );

    if (notes === null) return;

    try {
      await api.patch(`/Offboarding/${record.id}/exit-interview`, notes, {
        headers: { "Content-Type": "application/json" }
      });
      await loadData();
      showMessage("Exit interview notes saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save exit interview notes.");
    }
  };

  const openCreateForm = () => {
    setRecordForm(activeTab === "onboarding" ? emptyOnboarding : emptyOffboarding);
    setShowRecordForm(true);
    setError("");
  };

  const openTaskForm = record => {
    setSelectedRecord(record);
    setTaskForm(emptyTask);
    setShowTaskForm(true);
    setError("");
  };

  return (
    <div className="oo-page">
      <div className="oo-heading">
        <div>
          <h1>Employee Lifecycle</h1>
          <p>Manage employee onboarding, clearance, and exit processes.</p>
        </div>
        <button className="oo-refresh" onClick={loadData} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {message && <div className="oo-alert success">{message}</div>}
      {error && <div className="oo-alert danger">{error}</div>}

      <div className="oo-stats">
        <div className="oo-stat-card">
          <span className="oo-stat-icon blue"><Users size={20} /></span>
          <div><small>Total Records</small><strong>{allRecords.length}</strong></div>
        </div>
        <div className="oo-stat-card">
          <span className="oo-stat-icon orange"><Clock size={20} /></span>
          <div><small>In Progress</small><strong>{activeCount}</strong></div>
        </div>
        <div className="oo-stat-card">
          <span className="oo-stat-icon green"><CheckCircle size={20} /></span>
          <div><small>Completed</small><strong>{completedCount}</strong></div>
        </div>
        <div className="oo-stat-card">
          <span className="oo-stat-icon purple"><ClipboardCheck size={20} /></span>
          <div><small>Pending Tasks</small><strong>{pendingTasks}</strong></div>
        </div>
      </div>

      <div className="oo-toolbar">
        <div className="oo-tabs">
          <button
            className={activeTab === "onboarding" ? "active" : ""}
            onClick={() => { setActiveTab("onboarding"); setSearch(""); setStatusFilter("All"); }}
          >
            <UserPlus size={17} /> Onboarding
          </button>
          <button
            className={activeTab === "offboarding" ? "active" : ""}
            onClick={() => { setActiveTab("offboarding"); setSearch(""); setStatusFilter("All"); }}
          >
            <UserMinus size={17} /> Offboarding
          </button>
        </div>
        <button className="oo-primary" onClick={openCreateForm}>
          <Plus size={17} /> New {activeTab === "onboarding" ? "Onboarding" : "Offboarding"}
        </button>
      </div>

      <div className="oo-filters">
        <div className="oo-search">
          <Search size={17} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee or reason..."
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          <option value="InProgress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="oo-empty">Loading records...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="oo-empty">
          <ClipboardCheck size={35} />
          <h3>No records found</h3>
          <p>Create a new {activeTab === "onboarding" ? "onboarding" : "offboarding"} record to get started.</p>
        </div>
      ) : (
        <div className="oo-record-list">
          {filteredRecords.map(record => {
            const tasks = record.tasks || [];
            const completedTasks = tasks.filter(t => t.status === "Completed" || t.status === "Skipped").length;
            const progress = activeTab === "onboarding"
              ? record.progressPercentage || 0
              : tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0;

            return (
              <article className="oo-record-card" key={`${activeTab}-${record.id}`}>
                <div className="oo-record-top">
                  <div>
                    <h3>{record.employeeName || `Employee #${record.employeeId}`}</h3>
                    <p>{record.department || "No department"} · Employee ID: {record.employeeId}</p>
                  </div>
                  <span className={`oo-status ${record.status?.toLowerCase()}`}>
                    {record.status === "InProgress" ? "In Progress" : record.status}
                  </span>
                </div>

                {activeTab === "onboarding" ? (
                  <div className="oo-record-meta">
                    <span><CalendarDays size={15} /> Start date: {formatDate(record.startDate)}</span>
                    <span>Notes: {record.notes || "—"}</span>
                  </div>
                ) : (
                  <div className="oo-record-meta">
                    <span>Reason: {record.reason}</span>
                    <span>Resignation: {formatDate(record.resignationDate)}</span>
                    <span>Last working day: {formatDate(record.lastWorkingDate)}</span>
                  </div>
                )}

                <div className="oo-progress-heading">
                  <span>Task completion</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="oo-progress-track">
                  <div className="oo-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="oo-task-heading">
                  <strong>Tasks ({tasks.length})</strong>
                  {record.status === "InProgress" && (
                    <button className="oo-link-button" onClick={() => openTaskForm(record)}>
                      <Plus size={15} /> Add task
                    </button>
                  )}
                </div>

                {tasks.length === 0 ? (
                  <p className="oo-no-tasks">No tasks assigned yet.</p>
                ) : (
                  <div className="oo-task-list">
                    {tasks.map(task => (
                      <div className="oo-task-row" key={task.id}>
                        <div className="oo-task-info">
                          <strong>{task.title}</strong>
                          <small>{task.assignedTo} · Due: {formatDate(task.dueDate)}</small>
                          {task.description && <small>{task.description}</small>}
                        </div>
                        <select
                          value={task.status}
                          disabled={record.status !== "InProgress"}
                          onChange={e => handleTaskStatus(task.id, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="InProgress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Skipped">Skipped</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "offboarding" && (
                  <div className="oo-exit-notes">
                    <span>Exit interview: {record.exitInterviewNotes || "Not recorded"}</span>
                    {record.status === "InProgress" && (
                      <button className="oo-link-button" onClick={() => handleExitNotes(record)}>
                        Edit notes
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showRecordForm && (
        <div className="oo-modal-backdrop" onClick={() => setShowRecordForm(false)}>
          <div className="oo-modal" onClick={e => e.stopPropagation()}>
            <div className="oo-modal-heading">
              <div>
                <h2>Create {activeTab === "onboarding" ? "Onboarding" : "Offboarding"}</h2>
                <p>Enter the employee and process details.</p>
              </div>
              <button onClick={() => setShowRecordForm(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateRecord}>
              <label>Employee *</label>
              <select
                required
                value={recordForm.employeeId}
                onChange={e => setRecordForm({ ...recordForm, employeeId: e.target.value })}
              >
                <option value="">Select employee</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employeeName(employee)} (#{employee.id})
                  </option>
                ))}
              </select>

              {activeTab === "onboarding" ? (
                <>
                  <label>Start date *</label>
                  <input
                    type="date"
                    required
                    value={recordForm.startDate}
                    onChange={e => setRecordForm({ ...recordForm, startDate: e.target.value })}
                  />
                  <label>Notes</label>
                  <textarea
                    value={recordForm.notes}
                    onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })}
                    placeholder="Additional onboarding notes"
                  />
                </>
              ) : (
                <>
                  <label>Reason for leaving *</label>
                  <textarea
                    required
                    value={recordForm.reason}
                    onChange={e => setRecordForm({ ...recordForm, reason: e.target.value })}
                    placeholder="Enter resignation or separation reason"
                  />
                  <label>Resignation date *</label>
                  <input
                    type="date"
                    required
                    value={recordForm.resignationDate}
                    onChange={e => setRecordForm({ ...recordForm, resignationDate: e.target.value })}
                  />
                  <label>Last working date *</label>
                  <input
                    type="date"
                    required
                    min={recordForm.resignationDate}
                    value={recordForm.lastWorkingDate}
                    onChange={e => setRecordForm({ ...recordForm, lastWorkingDate: e.target.value })}
                  />
                  <label>Exit interview notes</label>
                  <textarea
                    value={recordForm.exitInterviewNotes}
                    onChange={e => setRecordForm({ ...recordForm, exitInterviewNotes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </>
              )}

              <div className="oo-modal-actions">
                <button type="button" className="oo-secondary" onClick={() => setShowRecordForm(false)}>Cancel</button>
                <button type="submit" className="oo-primary" disabled={saving}>
                  {saving ? "Saving..." : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskForm && (
        <div className="oo-modal-backdrop" onClick={() => setShowTaskForm(false)}>
          <div className="oo-modal" onClick={e => e.stopPropagation()}>
            <div className="oo-modal-heading">
              <div>
                <h2>Add Task</h2>
                <p>Assign a task to a responsible team.</p>
              </div>
              <button onClick={() => setShowTaskForm(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddTask}>
              <label>Task title *</label>
              <input
                required
                maxLength={150}
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="e.g. Verify documents"
              />
              <label>Description</label>
              <textarea
                value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Describe the task"
              />
              <label>Assigned to *</label>
              <select
                value={taskForm.assignedTo}
                onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
              >
                <option value="HR">HR</option>
                <option value="IT">IT</option>
                <option value="Manager">Manager</option>
              </select>
              <label>Due date</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
              <div className="oo-modal-actions">
                <button type="button" className="oo-secondary" onClick={() => setShowTaskForm(false)}>Cancel</button>
                <button type="submit" className="oo-primary" disabled={saving}>
                  {saving ? "Saving..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
