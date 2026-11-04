
import { useEffect, useState } from "react";
import {
  Wallet,
  Eye,
  Printer,
  RefreshCw,
  CalendarDays,
  CheckCircle,
  Clock,
  X,
  AlertCircle
} from "lucide-react";
import api from "../services/api";
import "./EmployeePayslips.css";

const formatPKR = (amount) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2
  }).format(amount || 0);

const monthName = (month) =>
  new Date(2000, month - 1).toLocaleString("en", { month: "long" });

export default function EmployeePayslips() {
  const [payrolls, setPayrolls] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/EmployeePayroll");
      setPayrolls(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your payslips. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, []);

  const openPayslip = async (id) => {
    try {
      setDetailsLoading(true);
      setError("");
      const response = await api.get(
        `/EmployeePayroll/${id}/payslip`
      );
      setSelected(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to open this payslip."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="employee-payslips">
      <div className="payslips-header">
        <div>
          <h2>My Payslips</h2>
          <p>View your salary history and monthly payslips.</p>
        </div>

        <button
          className="payslip-refresh"
          onClick={loadPayrolls}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="payslip-summary">
        <div className="payslip-summary-icon">
          <Wallet size={25} />
        </div>
        <div>
          <span>Total Salary Records</span>
          <h3>{payrolls.length}</h3>
        </div>
      </div>

      {error && (
        <div className="payslip-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="payslip-message">Loading your payslips...</div>
      ) : payrolls.length === 0 ? (
        <div className="payslip-empty">
          <Wallet size={38} />
          <h3>No payslips available</h3>
          <p>Your payroll records will appear here once they are generated.</p>
        </div>
      ) : (
        <div className="payslip-table-container">
          <table className="payslip-table">
            <thead>
              <tr>
                <th>Pay Period</th>
                <th>Basic Salary</th>
                <th>Gross Salary</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {payrolls.map((payroll) => (
                <tr key={payroll.id}>
                  <td>
                    <div className="pay-period">
                      <CalendarDays size={16} />
                      {monthName(payroll.month)} {payroll.year}
                    </div>
                  </td>
                  <td>{formatPKR(payroll.basicSalary)}</td>
                  <td>{formatPKR(payroll.grossSalary)}</td>
                  <td>{formatPKR(payroll.totalDeductions)}</td>
                  <td className="net-salary">
                    {formatPKR(payroll.netSalary)}
                  </td>
                  <td>
                    <span
                      className={`payslip-status ${
                        payroll.status?.toLowerCase() === "paid"
                          ? "paid"
                          : "pending"
                      }`}
                    >
                      {payroll.status?.toLowerCase() === "paid" ? (
                        <CheckCircle size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                      {payroll.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="payslip-view-button"
                      onClick={() => openPayslip(payroll.id)}
                      disabled={detailsLoading}
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailsLoading && (
        <div className="payslip-loading-overlay">
          Loading payslip...
        </div>
      )}

      {selected && (
        <div className="payslip-modal-overlay">
          <div className="payslip-modal">
            <div className="payslip-modal-actions no-print">
              <button
                className="payslip-close"
                onClick={() => setSelected(null)}
                aria-label="Close payslip"
              >
                <X size={21} />
              </button>
            </div>

            <div className="printable-payslip">
              <div className="print-payslip-header">
                <div>
                  <h2>WorkSphere</h2>
                  <p>Employee Salary Payslip</p>
                </div>
                <div className="print-payslip-period">
                  <strong>{monthName(selected.month)} {selected.year}</strong>
                  <span>Payslip #{selected.id}</span>
                </div>
              </div>

              <div className="print-employee-details">
                <div>
                  <span>Employee Name</span>
                  <strong>{selected.employeeName}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{selected.employeeEmail || "—"}</strong>
                </div>
                <div>
                  <span>Position</span>
                  <strong>{selected.position || "—"}</strong>
                </div>
                <div>
                  <span>Department</span>
                  <strong>{selected.department || "—"}</strong>
                </div>
              </div>

              <h3 className="payslip-section-title">Earnings</h3>
              <div className="payslip-breakdown">
                <div><span>Basic Salary</span><strong>{formatPKR(selected.basicSalary)}</strong></div>
                <div><span>Allowances</span><strong>{formatPKR(selected.allowances)}</strong></div>
                <div><span>Bonus</span><strong>{formatPKR(selected.bonus)}</strong></div>
                <div><span>Overtime</span><strong>{formatPKR(selected.overtime)}</strong></div>
                <div className="payslip-total"><span>Gross Salary</span><strong>{formatPKR(selected.grossSalary)}</strong></div>
              </div>

              <h3 className="payslip-section-title">Deductions</h3>
              <div className="payslip-breakdown">
                <div><span>Tax Deduction</span><strong>{formatPKR(selected.taxDeduction)}</strong></div>
                <div><span>Other Deductions</span><strong>{formatPKR(selected.otherDeductions)}</strong></div>
                <div className="payslip-total"><span>Total Deductions</span><strong>{formatPKR(selected.totalDeductions)}</strong></div>
              </div>

              <div className="payslip-net-total">
                <span>Net Salary</span>
                <strong>{formatPKR(selected.netSalary)}</strong>
              </div>

              <div className="payslip-payment-details">
                <div>
                  <span>Payment Status</span>
                  <strong>{selected.status}</strong>
                </div>
                <div>
                  <span>Payment Method</span>
                  <strong>{selected.paymentMethod || "Not specified"}</strong>
                </div>
                <div>
                  <span>Payment Date</span>
                  <strong>
                    {selected.paidAt
                      ? new Date(selected.paidAt).toLocaleDateString()
                      : "Not paid yet"}
                  </strong>
                </div>
              </div>

              {selected.notes && (
                <div className="payslip-notes">
                  <strong>Notes:</strong> {selected.notes}
                </div>
              )}

              <p className="payslip-footer">
                This payslip was generated electronically by WorkSphere.
              </p>
            </div>

            <div className="payslip-print-actions no-print">
              <button onClick={() => window.print()}>
                <Printer size={17} />
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
