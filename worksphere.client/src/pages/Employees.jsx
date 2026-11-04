
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";

import api from "../services/api";
import "./Employees.css";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  salary: "",
  hireDate: new Date().toISOString().slice(0, 10),
  departmentId: ""
};

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
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

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/Employee", {
        params: {
          search: search.trim(),
          departmentId: departmentId || undefined,
          page,
          pageSize
        }
      });

      const result = response.data;

      setEmployees(result.data || []);
      setTotalRecords(result.totalRecords || 0);
      setTotalPages(Math.max(result.totalPages || 1, 1));

    } catch (err) {
      console.error("Employee loading error:", err);
      setError(
        getErrorMessage(err, "Unable to load employees.")
      );
    } finally {
      setLoading(false);
    }
  }, [search, departmentId, page]);

  const loadDepartments = async () => {
    try {
      const response = await api.get("/Department");
      setDepartments(response.data || []);
    } catch (err) {
      console.error("Department loading error:", err);
      setError(
        getErrorMessage(err, "Unable to load departments.")
      );
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setEditingId(employee.id);

    setForm({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      salary: employee.salary ?? "",
      hireDate: employee.hireDate
        ? employee.hireDate.slice(0, 10)
        : "",
      departmentId: employee.departmentId ?? ""
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.departmentId) {
      setError("Please select a department.");
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      position: form.position.trim(),
      salary: Number(form.salary),
      hireDate: form.hireDate,
      departmentId: Number(form.departmentId)
    };

    try {
      setSaving(true);
      setError("");
      setNotice("");

      if (editingId !== null) {
        await api.put(`/Employee/${editingId}`, payload);
        setNotice("Employee updated successfully.");
      } else {
        await api.post("/Employee", payload);
        setNotice("Employee added successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      // Return to first page so the new employee is visible.
      setPage(1);

      // Load immediately with the first page.
      if (page === 1) {
        await loadEmployees();
      }

    } catch (err) {
      console.error("Employee save error:", err);
      setError(
        getErrorMessage(err, "Unable to save employee.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this employee?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");

      await api.delete(`/Employee/${id}`);

      setNotice("Employee deleted successfully.");

      if (employees.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadEmployees();
      }

    } catch (err) {
      console.error("Employee delete error:", err);
      setError(
        getErrorMessage(err, "Unable to delete employee.")
      );
    }
  };

  const getDepartmentName = (employee) => {
    if (employee.department?.name) {
      return employee.department.name;
    }

    if (typeof employee.department === "string") {
      return employee.department;
    }

    const department = departments.find(
      (item) => item.id === employee.departmentId
    );

    return department?.name || "Unknown";
  };

  const formatSalary = (salary) => {
    return Number(salary || 0).toLocaleString("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="employees-page">

      <div className="employees-heading">
        <div>
          <h2>Employee Directory</h2>
          <p>Manage and organize your organization's workforce.</p>
        </div>

        <button
          className="employee-add-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      {error && (
        <div className="employee-alert error">
          {error}
        </div>
      )}

      {notice && (
        <div className="employee-alert success">
          {notice}
        </div>
      )}

      <div className="employee-toolbar">

        <div className="employee-filters">
          <div className="employee-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name, email or position..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="employee-department-filter"
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="employee-refresh-btn"
          onClick={loadEmployees}
          title="Refresh employees"
        >
          <RefreshCw size={17} />
        </button>

      </div>

      <div className="employee-table-card">

        {loading ? (
          <div className="employee-message">
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="employee-message">
            <Users size={38} />
            <h3>No employees found</h3>
            <p>Try another search or add your first employee.</p>
          </div>
        ) : (
          <div className="employee-table-scroll">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-name-cell">
                        <div className="employee-avatar">
                          {employee.firstName?.charAt(0)}
                          {employee.lastName?.charAt(0)}
                        </div>

                        <strong>
                          {employee.firstName} {employee.lastName}
                        </strong>
                      </div>
                    </td>

                    <td>{employee.email}</td>
                    <td>{employee.phone || "—"}</td>
                    <td>{employee.position}</td>
                    <td>{getDepartmentName(employee)}</td>
                    <td>{formatSalary(employee.salary)}</td>

                    <td>
                      <div className="employee-actions">
                        <button
                          className="employee-edit"
                          title="Edit employee"
                          onClick={() => openEditModal(employee)}
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          className="employee-delete"
                          title="Delete employee"
                          onClick={() => handleDelete(employee.id)}
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

        <div className="employee-pagination">
          <span>
            Showing {employees.length ? (page - 1) * pageSize + 1 : 0}
            {" - "}
            {(page - 1) * pageSize + employees.length}
            {" of "}
            {totalRecords} employees
          </span>

          <div className="employee-pagination-buttons">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

      </div>

      {modalOpen && (
        <div
          className="employee-modal-overlay"
          onClick={() => {
            if (!saving) setModalOpen(false);
          }}
        >
          <div
            className="employee-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="employee-modal-header">
              <div>
                <h2>
                  {editingId !== null ? "Edit Employee" : "Add Employee"}
                </h2>
                <p>Enter the employee information below.</p>
              </div>

              <button
                type="button"
                className="employee-close"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="employee-form-grid">

                <label>
                  First Name
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Last Name
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Email Address
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Job Position
                  <input
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Salary (PKR)
                  <input
                    type="number"
                    name="salary"
                    value={form.salary}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </label>

                <label>
                  Hire Date
                  <input
                    type="date"
                    name="hireDate"
                    value={form.hireDate}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Department
                  <select
                    name="departmentId"
                    value={form.departmentId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Department</option>

                    {departments.map((department) => (
                      <option
                        key={department.id}
                        value={department.id}
                      >
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

              </div>

              {error && (
                <div className="employee-alert error modal-error">
                  {error}
                </div>
              )}

              <div className="employee-modal-actions">
                <button
                  type="button"
                  className="employee-cancel-btn"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="employee-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Employee"
                      : "Save Employee"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Employees;
