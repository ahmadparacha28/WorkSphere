
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Building2,
  Users,
  RefreshCw
} from "lucide-react";

import api from "../services/api";
import "./Departments.css";

const emptyForm = {
  name: "",
  description: ""
};

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
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

  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/Department");
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Department loading error:", err);
      setError(
        getErrorMessage(err, "Unable to load departments.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return departments;

    return departments.filter((department) =>
      `${department.name} ${department.description || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [departments, search]);

  const totalEmployees = departments.reduce(
    (total, department) => total + (department.employeeCount || 0),
    0
  );

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (department) => {
    setEditingId(department.id);

    setForm({
      name: department.name || "",
      description: department.description || ""
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

    const payload = {
      name: form.name.trim(),
      description: form.description.trim()
    };

    if (!payload.name) {
      setError("Department name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      if (editingId !== null) {
        await api.put(`/Department/${editingId}`, payload);
        setNotice("Department updated successfully.");
      } else {
        await api.post("/Department", payload);
        setNotice("Department created successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadDepartments();
    } catch (err) {
      console.error("Department save error:", err);
      setError(
        getErrorMessage(err, "Unable to save department.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department) => {
    const employeeCount = department.employeeCount || 0;

    if (employeeCount > 0) {
      setError(
        `Cannot delete ${department.name} because it has ${employeeCount} employee(s).`
      );
      setNotice("");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the ${department.name} department?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");

      await api.delete(`/Department/${department.id}`);

      setNotice("Department deleted successfully.");
      await loadDepartments();
    } catch (err) {
      console.error("Department delete error:", err);
      setError(
        getErrorMessage(
          err,
          "Unable to delete department. It may contain employees."
        )
      );
    }
  };

  return (
    <div className="departments-page">

      {/* Page heading */}
      <div className="departments-heading">
        <div>
          <h2>Department Directory</h2>
          <p>Create and manage your organization's departments.</p>
        </div>

        <button
          className="department-add-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Department
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="department-alert error">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="department-alert success">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="department-stats">

        <div className="department-stat-card">
          <div className="department-stat-icon purple">
            <Building2 size={22} />
          </div>
          <div>
            <span>Total Departments</span>
            <h3>{departments.length}</h3>
          </div>
        </div>

        <div className="department-stat-card">
          <div className="department-stat-icon blue">
            <Users size={22} />
          </div>
          <div>
            <span>Total Employees</span>
            <h3>{totalEmployees}</h3>
          </div>
        </div>

        <div className="department-stat-card">
          <div className="department-stat-icon green">
            <Building2 size={22} />
          </div>
          <div>
            <span>Departments With Employees</span>
            <h3>
              {departments.filter(
                (department) => department.employeeCount > 0
              ).length}
            </h3>
          </div>
        </div>

      </div>

      {/* Search and refresh */}
      <div className="department-toolbar">
        <div className="department-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className="department-refresh-btn"
          onClick={loadDepartments}
          title="Refresh departments"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* Department cards */}
      {loading ? (
        <div className="department-empty">
          Loading departments...
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="department-empty">
          <Building2 size={40} />
          <h3>No departments found</h3>
          <p>
            {search
              ? "Try another search term."
              : "Create your first department to get started."}
          </p>
        </div>
      ) : (
        <div className="department-grid">

          {filteredDepartments.map((department) => (
            <div className="department-card" key={department.id}>

              <div className="department-card-top">
                <div className="department-card-icon">
                  <Building2 size={23} />
                </div>

                <div className="department-card-actions">
                  <button
                    className="department-edit-btn"
                    title="Edit department"
                    onClick={() => openEditModal(department)}
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    className="department-delete-btn"
                    title="Delete department"
                    onClick={() => handleDelete(department)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3>{department.name}</h3>

              <p className="department-description">
                {department.description || "No description provided."}
              </p>

              <div className="department-card-footer">
                <div className="department-employee-count">
                  <Users size={16} />
                  <span>
                    {department.employeeCount || 0} Employees
                  </span>
                </div>

                <span className="department-id">
                  ID: {department.id}
                </span>
              </div>

            </div>
          ))}

        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <div
          className="department-modal-overlay"
          onClick={() => {
            if (!saving) setModalOpen(false);
          }}
        >
          <div
            className="department-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="department-modal-header">
              <div>
                <h2>
                  {editingId !== null
                    ? "Edit Department"
                    : "Add Department"}
                </h2>
                <p>Enter the department information below.</p>
              </div>

              <button
                type="button"
                className="department-close-btn"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="department-form">

                <label>
                  Department Name
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Software Development"
                    value={form.name}
                    onChange={handleChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    name="description"
                    placeholder="Describe the department's responsibilities..."
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                  />
                </label>

              </div>

              {error && (
                <div className="department-alert error">
                  {error}
                </div>
              )}

              <div className="department-modal-actions">

                <button
                  type="button"
                  className="department-cancel-btn"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="department-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Department"
                      : "Create Department"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Departments;
