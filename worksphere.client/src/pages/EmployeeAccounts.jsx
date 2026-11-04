
import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Link2,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  LoaderCircle,
  Users
} from "lucide-react";

import api from "../services/api";
import "./EmployeeAccounts.css";

function EmployeeAccounts() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [accountStatus, setAccountStatus] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    password: ""
  });

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/Employee", {
        params: {
          search: appliedSearch || undefined,
          accountStatus: accountStatus || undefined,
          page,
          pageSize: 10
        }
      });

      setEmployees(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalRecords(response.data.totalRecords || 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load employee accounts."
      );
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, accountStatus, page]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleFormChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const handleStatusChange = (e) => {
    setAccountStatus(e.target.value);
    setPage(1);
  };

  const handleRegisterAndLink = async (e) => {
    e.preventDefault();

    if (!form.employeeId || !form.fullName ||
        !form.email || !form.password) {
      setError("Please complete all registration fields.");
      setMessage("");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.post("/Auth/register", {
        fullName: form.fullName,
        email: form.email,
        password: form.password
      });

      await api.post(
        `/Employee/${form.employeeId}/link-account`
      );

      setMessage("Employee account registered and linked successfully.");

      setForm({
        employeeId: "",
        fullName: "",
        email: "",
        password: ""
      });

      await loadEmployees();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Account registration or linking failed. Check the employee details."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkEmployee = async (employeeId) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.post(`/Employee/${employeeId}/link-account`);

      setMessage(`Account linked successfully for employee #${employeeId}.`);

      await loadEmployees();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to link this employee account."
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="employee-accounts">

      <div className="accounts-heading">
        <div>
          <h1>Employee Accounts</h1>
          <p>Manage employee login accounts and access.</p>
        </div>

        <button
          className="accounts-refresh"
          onClick={loadEmployees}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="accounts-alert success">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="accounts-alert error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Registration Form */}
      <section className="accounts-card">
        <div className="accounts-card-heading">
          <UserPlus size={21} />
          <div>
            <h2>Register Employee Account</h2>
            <p>Create a login account and link it to an employee.</p>
          </div>
        </div>

        <form onSubmit={handleRegisterAndLink}>
          <div className="accounts-form-grid">

            <div className="accounts-field">
              <label>Employee ID</label>
              <input
                type="number"
                name="employeeId"
                value={form.employeeId}
                onChange={handleFormChange}
                placeholder="Enter employee ID"
                min="1"
                required
              />
            </div>

            <div className="accounts-field">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleFormChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="accounts-field">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                placeholder="Enter employee email"
                required
              />
            </div>

            <div className="accounts-field">
              <label>Temporary Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleFormChange}
                placeholder="Enter temporary password"
                minLength="8"
                required
              />
            </div>

          </div>

          <button
            type="submit"
            className="accounts-primary-btn"
            disabled={actionLoading}
          >
            {actionLoading ? (
              <LoaderCircle size={17} />
            ) : (
              <UserPlus size={17} />
            )}
            Register and Link Account
          </button>
        </form>

        <p className="accounts-note">
          The employee record must already exist. Use the same email
          address as the employee record. New accounts receive the
          Employee role.
        </p>
      </section>

      {/* Employee Account List */}
      <section className="accounts-card">
        <div className="accounts-card-heading">
          <Users size={21} />
          <div>
            <h2>Employee Account Directory</h2>
            <p>
              {totalRecords} employee records found.
            </p>
          </div>
        </div>

        <form className="accounts-filters" onSubmit={handleSearch}>
          <div className="accounts-search">
            <Search size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name or email..."
            />
          </div>

          <select
            value={accountStatus}
            onChange={handleStatusChange}
          >
            <option value="">All Accounts</option>
            <option value="linked">Linked Accounts</option>
            <option value="notlinked">Not Linked</option>
          </select>

          <button type="submit" className="accounts-search-btn">
            Search
          </button>
        </form>

        <div className="accounts-table-wrapper">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee Email</th>
                <th>Account Email</th>
                <th>Account Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="accounts-empty">
                    <LoaderCircle className="accounts-spinner" size={22} />
                    Loading employee accounts...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="accounts-empty">
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="accounts-employee-name">
                        <strong>
                          {employee.firstName} {employee.lastName}
                        </strong>
                        <span>Employee #{employee.id}</span>
                      </div>
                    </td>

                    <td>{employee.email}</td>

                    <td>
                      {employee.accountEmail || "—"}
                    </td>

                    <td>
                      {employee.hasAccount ? (
                        <span className="account-status linked">
                          <CheckCircle size={14} />
                          Linked
                        </span>
                      ) : (
                        <span className="account-status not-linked">
                          <AlertCircle size={14} />
                          Not Linked
                        </span>
                      )}
                    </td>

                    <td>
                      {employee.hasAccount ? (
                        <span className="account-action-complete">
                          <CheckCircle size={15} />
                          Connected
                        </span>
                      ) : (
                        <button
                          className="accounts-link-btn"
                          onClick={() => handleLinkEmployee(employee.id)}
                          disabled={actionLoading}
                        >
                          <Link2 size={15} />
                          Link Account
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="accounts-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div>
            <button
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1 || loading}
            >
              Previous
            </button>

            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default EmployeeAccounts;
