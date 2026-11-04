import { useEffect, useState } from "react";
import {
  Wallet,
  Users,
  Banknote,
  Clock,
  Plus,
  Search,
  RefreshCw,
  Edit,
  CheckCircle,
  Printer,
  X,
  CalendarDays,
  TrendingUp,
  AlertCircle
} from "lucide-react";

import api from "../services/api";
import "./Payroll.css";

const currentDate = new Date();

const monthNames = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];

const currency = (amount) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2
  }).format(Number(amount || 0));

const emptyForm = {
  allowances: 0,
  bonus: 0,
  overtime: 0,
  taxDeduction: 0,
  otherDeductions: 0,
  notes: ""
};

function Payroll() {
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [payingId, setPayingId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");

  const [payslip, setPayslip] = useState(null);

  const getError = (err) =>
    err.response?.data?.message ||
    err.response?.data?.title ||
    err.message ||
    "Something went wrong.";

  const loadPayroll = async () => {
    try {
      setLoading(true);
      setError("");

      const [recordsResponse, summaryResponse] = await Promise.all([
        api.get("/Payroll", {
          params: { month, year }
        }),
        api.get("/Payroll/summary", {
          params: { month, year }
        })
      ]);

      setRecords(recordsResponse.data);
      setSummary(summaryResponse.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [month, year]);

  const handleGenerate = async () => {
    const confirmed = window.confirm(
      `Generate payroll for ${monthNames[month - 1]} ${year}?\n\n` +
      "Existing payroll records will be skipped."
    );

    if (!confirmed) return;

    try {
      setGenerating(true);
      setError("");
      setSuccess("");

      const response = await api.post("/Payroll/generate", {
        month: Number(month),
        year: Number(year)
      });

      setSuccess(
        `${response.data.message} Generated: ${response.data.generatedCount}, ` +
        `Skipped: ${response.data.skippedCount}.`
      );

      await loadPayroll();
    } catch (err) {
      setError(getError(err));
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (record) => {
    setEditingRecord(record);

    setForm({
      allowances: record.allowances,
      bonus: record.bonus,
      overtime: record.overtime,
      taxDeduction: record.taxDeduction,
      otherDeductions: record.otherDeductions,
      notes: record.notes || ""
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "notes" ? value : value
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await api.put(`/Payroll/${editingRecord.id}`, {
        allowances: Number(form.allowances),
        bonus: Number(form.bonus),
        overtime: Number(form.overtime),
        taxDeduction: Number(form.taxDeduction),
        otherDeductions: Number(form.otherDeductions),
        notes: form.notes
      });

      setEditingRecord(null);
      setSuccess("Payroll record updated successfully.");

      await loadPayroll();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (record) => {
    const method = window.prompt(
      "Enter payment method:\nBank Transfer, Cash, or Cheque",
      "Bank Transfer"
    );

    if (!method || !method.trim()) return;

    const confirmed = window.confirm(
      `Mark ${record.employeeName}'s salary of ${currency(record.netSalary)} as paid?`
    );

    if (!confirmed) return;

    try {
      setPayingId(record.id);
      setError("");

      await api.patch(`/Payroll/${record.id}/pay`, {
        paymentMethod: method.trim()
      });

      setSuccess("Payment recorded successfully.");
      await loadPayroll();
    } catch (err) {
      setError(getError(err));
    } finally {
      setPayingId(null);
    }
  };

  const openPayslip = async (record) => {
    try {
      const response = await api.get(
        `/Payroll/${record.id}/payslip`
      );

      setPayslip(response.data);
    } catch (err) {
      setError(getError(err));
    }
  };

  const filteredRecords = records.filter((record) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      record.employeeName?.toLowerCase().includes(searchValue) ||
      record.employeeEmail?.toLowerCase().includes(searchValue) ||
      record.departmentName?.toLowerCase().includes(searchValue);

    const matchesStatus =
      statusFilter === "All" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const calculatedGross =
    Number(editingRecord?.basicSalary || 0) +
    Number(form.allowances || 0) +
    Number(form.bonus || 0) +
    Number(form.overtime || 0);

  const calculatedDeductions =
    Number(form.taxDeduction || 0) +
    Number(form.otherDeductions || 0);

  const calculatedNet = calculatedGross - calculatedDeductions;

  return (
    <div className="payroll-page">

      <div className="payroll-heading">
        <div>
          <h2>Payroll Management</h2>
          <p>Manage employee salaries, deductions and monthly payments.</p>
        </div>

        <div className="payroll-heading-actions">
          <button
            className="payroll-secondary-btn"
            onClick={loadPayroll}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="payroll-primary-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            <Plus size={18} />
            {generating ? "Generating..." : "Generate Payroll"}
          </button>
        </div>
      </div>

      <div className="payroll-filters">

        <div className="payroll-period">
          <CalendarDays size={18} />

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from(
              { length: 7 },
              (_, index) => currentDate.getFullYear() - 3 + index
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="payroll-search">
          <Search size={17} />
          <input
            placeholder="Search employee or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="payroll-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Payments</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
        </select>

      </div>

      {error && (
        <div className="payroll-alert payroll-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="payroll-alert payroll-success">
          <CheckCircle size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>
            <X size={17} />
          </button>
        </div>
      )}

      <div className="payroll-summary-grid">

        <div className="payroll-stat-card">
          <div className="payroll-stat-icon purple">
            <Users size={21} />
          </div>
          <div>
            <span>Total Employees</span>
            <h3>{summary?.totalEmployees ?? 0}</h3>
            <small>Payroll records generated</small>
          </div>
        </div>

        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue">
            <Wallet size={21} />
          </div>
          <div>
            <span>Net Payroll</span>
            <h3>{currency(summary?.netPayroll)}</h3>
            <small>After deductions</small>
          </div>
        </div>

        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green">
            <Banknote size={21} />
          </div>
          <div>
            <span>Paid Amount</span>
            <h3>{currency(summary?.paidAmount)}</h3>
            <small>{summary?.paidEmployees ?? 0} employees paid</small>
          </div>
        </div>

        <div className="payroll-stat-card">
          <div className="payroll-stat-icon orange">
            <Clock size={21} />
          </div>
          <div>
            <span>Pending Amount</span>
            <h3>{currency(summary?.pendingAmount)}</h3>
            <small>{summary?.pendingEmployees ?? 0} payments pending</small>
          </div>
        </div>

      </div>

      <div className="payroll-report-strip">
        <div>
          <TrendingUp size={19} />
          <span>
            Gross Payroll: <strong>{currency(summary?.grossPayroll)}</strong>
          </span>
        </div>

        <div>
          <span>
            Total Deductions: <strong>{currency(summary?.totalDeductions)}</strong>
          </span>
        </div>
      </div>

      <div className="payroll-table-card">

        <div className="payroll-table-heading">
          <div>
            <h3>Monthly Payroll Records</h3>
            <p>
              {monthNames[month - 1]} {year} · {filteredRecords.length} records
            </p>
          </div>
        </div>

        {loading ? (
          <div className="payroll-empty">Loading payroll records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="payroll-empty">
            <Wallet size={35} />
            <h3>No payroll records found</h3>
            <p>
              Generate payroll for this month to create employee salary records.
            </p>
          </div>
        ) : (
          <div className="payroll-table-wrapper">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Basic Salary</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="payroll-employee">
                        <strong>{record.employeeName}</strong>
                        <small>{record.employeeEmail}</small>
                      </div>
                    </td>

                    <td>{record.departmentName}</td>
                    <td>{currency(record.basicSalary)}</td>
                    <td>{currency(record.grossSalary)}</td>
                    <td>{currency(record.totalDeductions)}</td>

                    <td className="payroll-net">
                      {currency(record.netSalary)}
                    </td>

                    <td>
                      <span
                        className={`payroll-status ${
                          record.status === "Paid" ? "paid" : "pending"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>

                    <td>
                      <div className="payroll-actions">

                        <button
                          title="View payslip"
                          className="payroll-icon-btn"
                          onClick={() => openPayslip(record)}
                        >
                          <Printer size={17} />
                        </button>

                        {record.status === "Pending" && (
                          <>
                            <button
                              title="Edit payroll"
                              className="payroll-icon-btn"
                              onClick={() => openEdit(record)}
                            >
                              <Edit size={17} />
                            </button>

                            <button
                              title="Mark as paid"
                              className="payroll-icon-btn payroll-pay-btn"
                              onClick={() => handleMarkPaid(record)}
                              disabled={payingId === record.id}
                            >
                              <CheckCircle size={17} />
                            </button>
                          </>
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

      {/* Edit Payroll Modal */}
      {editingRecord && (
        <div
          className="payroll-modal-overlay"
          onClick={() => setEditingRecord(null)}
        >
          <div
            className="payroll-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="payroll-modal-heading">
              <div>
                <h3>Edit Payroll</h3>
                <p>{editingRecord.employeeName}</p>
              </div>

              <button onClick={() => setEditingRecord(null)}>
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>

              <div className="payroll-basic-display">
                <span>Basic Salary</span>
                <strong>{currency(editingRecord.basicSalary)}</strong>
              </div>

              <div className="payroll-form-grid">
                <label>
                  Allowances
                  <input
                    type="number"
                    name="allowances"
                    min="0"
                    step="0.01"
                    value={form.allowances}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Bonus
                  <input
                    type="number"
                    name="bonus"
                    min="0"
                    step="0.01"
                    value={form.bonus}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Overtime
                  <input
                    type="number"
                    name="overtime"
                    min="0"
                    step="0.01"
                    value={form.overtime}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Tax Deduction
                  <input
                    type="number"
                    name="taxDeduction"
                    min="0"
                    step="0.01"
                    value={form.taxDeduction}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Other Deductions
                  <input
                    type="number"
                    name="otherDeductions"
                    min="0"
                    step="0.01"
                    value={form.otherDeductions}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>

              <label className="payroll-notes-label">
                Notes
                <textarea
                  name="notes"
                  rows="3"
                  maxLength="500"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Optional payroll notes..."
                />
              </label>

              <div className="payroll-calculation">
                <div>
                  <span>Gross Salary</span>
                  <strong>{currency(calculatedGross)}</strong>
                </div>

                <div>
                  <span>Total Deductions</span>
                  <strong>{currency(calculatedDeductions)}</strong>
                </div>

                <div className="calculation-net">
                  <span>Net Salary</span>
                  <strong>{currency(calculatedNet)}</strong>
                </div>
              </div>

              {calculatedNet < 0 && (
                <p className="payroll-validation">
                  Deductions cannot exceed gross salary.
                </p>
              )}

              <div className="payroll-modal-actions">
                <button
                  type="button"
                  className="payroll-secondary-btn"
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payroll-primary-btn"
                  disabled={saving || calculatedNet < 0}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {payslip && (
        <div
          className="payroll-modal-overlay payslip-overlay"
          onClick={() => setPayslip(null)}
        >
          <div
            className="payroll-modal payslip-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="payslip-toolbar no-print">
              <strong>Employee Payslip</strong>

              <div>
                <button onClick={() => window.print()}>
                  <Printer size={17} /> Print
                </button>

                <button onClick={() => setPayslip(null)}>
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="payslip-content">
              <div className="payslip-company">
                <h1>WorkSphere</h1>
                <p>Employee Salary Statement</p>
              </div>

              <div className="payslip-period">
                <span>PAY PERIOD</span>
                <strong>
                  {monthNames[payslip.month - 1]} {payslip.year}
                </strong>
              </div>

              <div className="payslip-employee-info">
                <div>
                  <span>Employee Name</span>
                  <strong>{payslip.employeeName}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{payslip.employeeEmail}</strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>{payslip.departmentName}</strong>
                </div>

                <div>
                  <span>Position</span>
                  <strong>{payslip.position || "—"}</strong>
                </div>
              </div>

              <h3 className="payslip-section-title">Earnings</h3>

              <div className="payslip-line">
                <span>Basic Salary</span>
                <strong>{currency(payslip.basicSalary)}</strong>
              </div>

              <div className="payslip-line">
                <span>Allowances</span>
                <strong>{currency(payslip.allowances)}</strong>
              </div>

              <div className="payslip-line">
                <span>Bonus</span>
                <strong>{currency(payslip.bonus)}</strong>
              </div>

              <div className="payslip-line">
                <span>Overtime</span>
                <strong>{currency(payslip.overtime)}</strong>
              </div>

              <div className="payslip-total">
                <span>Gross Salary</span>
                <strong>{currency(payslip.grossSalary)}</strong>
              </div>

              <h3 className="payslip-section-title">Deductions</h3>

              <div className="payslip-line">
                <span>Tax Deduction</span>
                <strong>{currency(payslip.taxDeduction)}</strong>
              </div>

              <div className="payslip-line">
                <span>Other Deductions</span>
                <strong>{currency(payslip.otherDeductions)}</strong>
              </div>

              <div className="payslip-total">
                <span>Total Deductions</span>
                <strong>{currency(payslip.totalDeductions)}</strong>
              </div>

              <div className="payslip-net">
                <span>NET SALARY</span>
                <strong>{currency(payslip.netSalary)}</strong>
              </div>

              <div className="payslip-payment-info">
                <p>
                  Payment Status: <strong>{payslip.status}</strong>
                </p>

                <p>
                  Payment Method: <strong>{payslip.paymentMethod || "Not paid"}</strong>
                </p>

                <p>
                  Payment Date:{" "}
                  <strong>
                    {payslip.paidAt
                      ? new Date(payslip.paidAt).toLocaleDateString()
                      : "Pending"}
                  </strong>
                </p>
              </div>

              {payslip.notes && (
                <p className="payslip-notes">
                  Notes: {payslip.notes}
                </p>
              )}

              <div className="payslip-footer">
                <p>This is a computer-generated payslip.</p>
                <p>WorkSphere Employee Management System</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Payroll;