
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  CalendarDays,
  AlertCircle
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

import api from "../services/api";
import "./Dashboard.css";

const COLORS = ["#f59e0b", "#16a36a", "#e05252"];

function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0
  });

  const [departmentData, setDepartmentData] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/Employee", {
          params: { page: 1, pageSize: 10 }
        }),
        api.get("/Department"),
        api.get("/Leave")
      ]);

      const [employeeResult, departmentResult, leaveResult] = results;

      let totalEmployees = 0;
      let departments = [];
      let leaves = [];

      if (employeeResult.status === "fulfilled") {
        const employeeResponse = employeeResult.value.data;

        totalEmployees =
          Number(employeeResponse.totalRecords) ||
          employeeResponse.data?.length ||
          0;
      } else {
        console.error("Employee statistics error:", employeeResult.reason);
      }

      if (departmentResult.status === "fulfilled") {
        departments = Array.isArray(departmentResult.value.data)
          ? departmentResult.value.data
          : [];
      } else {
        console.error("Department statistics error:", departmentResult.reason);
      }

      if (leaveResult.status === "fulfilled") {
        leaves = Array.isArray(leaveResult.value.data)
          ? leaveResult.value.data
          : [];
      } else {
        console.error("Leave statistics error:", leaveResult.reason);
      }

      const pendingLeaves = leaves.filter(
        (leave) => leave.status?.toLowerCase() === "pending"
      ).length;

      const approvedLeaves = leaves.filter(
        (leave) => leave.status?.toLowerCase() === "approved"
      ).length;

      const rejectedLeaves = leaves.filter(
        (leave) => leave.status?.toLowerCase() === "rejected"
      ).length;

      setStats({
        totalEmployees,
        totalDepartments: departments.length,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves
      });

      setDepartmentData(
        departments.map((department) => ({
          name: department.name,
          employees: Number(department.employeeCount) || 0
        }))
      );

      const sortedLeaves = [...leaves].sort((a, b) => {
        return (
          new Date(b.createdAt || b.startDate).getTime() -
          new Date(a.createdAt || a.startDate).getTime()
        );
      });

      setRecentLeaves(sortedLeaves.slice(0, 5));

      if (results.every((result) => result.status === "rejected")) {
        setError("Unable to load dashboard data. Please check your API connection.");
      } else if (results.some((result) => result.status === "rejected")) {
        setError("Some dashboard information could not be loaded.");
      }

    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError("Unable to load dashboard information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const leaveChartData = [
    { name: "Pending", value: stats.pendingLeaves },
    { name: "Approved", value: stats.approvedLeaves },
    { name: "Rejected", value: stats.rejectedLeaves }
  ];

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-GB", {
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
    <div className="dashboard-page">

      {/* Header */}
      <div className="dashboard-heading">
        <div>
          <h2>Dashboard Overview</h2>
          <p>Real-time overview of your organization's workforce.</p>
        </div>

        <button
          className="dashboard-refresh-btn"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "dashboard-spinning" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="dashboard-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Statistics */}
      <div className="dashboard-stats-grid">

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon blue">
              <Users size={23} />
            </div>
            <span className="dashboard-stat-label">Workforce</span>
          </div>
          <h3>{loading ? "—" : stats.totalEmployees}</h3>
          <p>Total Employees</p>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon purple">
              <Building2 size={23} />
            </div>
            <span className="dashboard-stat-label">Organization</span>
          </div>
          <h3>{loading ? "—" : stats.totalDepartments}</h3>
          <p>Total Departments</p>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon orange">
              <Clock size={23} />
            </div>
            <span className="dashboard-stat-label">Needs Review</span>
          </div>
          <h3>{loading ? "—" : stats.pendingLeaves}</h3>
          <p>Pending Leave Requests</p>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon green">
              <CheckCircle size={23} />
            </div>
            <span className="dashboard-stat-label">Completed</span>
          </div>
          <h3>{loading ? "—" : stats.approvedLeaves}</h3>
          <p>Approved Leave Requests</p>
        </div>

      </div>

      {/* Charts */}
      <div className="dashboard-charts-grid">

        <div className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h3>Department Distribution</h3>
              <p>Employees across departments</p>
            </div>
            <Building2 size={20} />
          </div>

          {loading ? (
            <div className="dashboard-chart-empty">Loading chart...</div>
          ) : departmentData.length === 0 ? (
            <div className="dashboard-chart-empty">
              No department data available.
            </div>
          ) : (
            <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="employees"
                    name="Employees"
                    fill="#635bdb"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h3>Leave Overview</h3>
              <p>Breakdown by request status</p>
            </div>
            <CalendarDays size={20} />
          </div>

          {loading ? (
            <div className="dashboard-chart-empty">Loading chart...</div>
          ) : stats.pendingLeaves + stats.approvedLeaves + stats.rejectedLeaves === 0 ? (
            <div className="dashboard-chart-empty">
              No leave requests available.
            </div>
          ) : (
            <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveChartData.filter((item) => item.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {leaveChartData
                      .filter((item) => item.value > 0)
                      .map((item) => (
                        <Cell
                          key={item.name}
                          fill={
                            item.name === "Pending"
                              ? COLORS[0]
                              : item.name === "Approved"
                                ? COLORS[1]
                                : COLORS[2]
                          }
                        />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Recent leave requests */}
      <div className="dashboard-panel dashboard-recent-panel">

        <div className="dashboard-panel-heading">
          <div>
            <h3>Recent Leave Requests</h3>
            <p>Latest employee leave applications</p>
          </div>
          <CalendarDays size={20} />
        </div>

        {loading ? (
          <div className="dashboard-chart-empty">
            Loading recent requests...
          </div>
        ) : recentLeaves.length === 0 ? (
          <div className="dashboard-chart-empty">
            No leave requests have been submitted yet.
          </div>
        ) : (
          <div className="dashboard-recent-table-wrapper">
            <table className="dashboard-recent-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <strong>{leave.employeeName || "Unknown"}</strong>
                    </td>
                    <td>{leave.leaveType}</td>
                    <td>
                      {formatDate(leave.createdAt || leave.startDate)}
                    </td>
                    <td>
                      <span
                        className={`dashboard-status ${getStatusClass(leave.status)}`}
                      >
                        {leave.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}

export default Dashboard;
