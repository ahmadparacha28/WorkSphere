
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  UserPlus,
  BarChart3,
  Wallet,
  ClipboardCheck,
  BriefcaseBusiness,
  UserRoundPlus
} from "lucide-react";

import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Leaves from "./pages/Leaves";
import Dashboard from "./pages/Dashboard";
import EmployeePortal from "./pages/EmployeePortal";
import EmployeeAccounts from "./pages/EmployeeAccounts";
import NotificationBell from "./components/NotificationBell";
import Attendance from "./pages/Attendance";
import AttendanceReports from "./pages/AttendanceReports";
import Payroll from "./pages/Payroll";
import Performance from "./pages/Performance";
import Recruitment from "./pages/Recruitment";
import CareerPortal from "./pages/CareerPortal";
import OnboardingOffboarding from "./pages/OnboardingOffboarding";

import "./App.css";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Employees", icon: Users },
  { name: "Departments", icon: Building2 },
  { name: "Employee Accounts", icon: UserPlus },
  { name: "Leave Management", icon: CalendarDays },
  { name: "Attendance", icon: CalendarDays },
  { name: "Attendance Reports", icon: BarChart3 },
  { name: "Payroll Management", icon: Wallet },
  { name: "Performance Management", icon: ClipboardCheck },
  { name: "Recruitment Management", icon: BriefcaseBusiness },
  { name: "Onboarding & Offboarding", icon: UserRoundPlus },
  { name: "Settings", icon: Settings }
];

function App() {
  const { user, logout } = useAuth();

  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [publicPage, setPublicPage] = useState("careers");

  // Public visitor access
  if (!user) {
    return publicPage === "login" ? (
      <Login onShowCareers={() => setPublicPage("careers")} />
    ) : (
      <CareerPortal onLogin={() => setPublicPage("login")} />
    );
  }

  const roles = user.roles || [];

  const isEmployee =
    roles.some(role => role.toLowerCase() === "employee") &&
    !roles.some(role =>
      ["admin", "hr"].includes(role.toLowerCase())
    );

  // Employee self-service portal
  if (isEmployee) {
    return <EmployeePortal />;
  }

  const displayName = user.fullName || user.email || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const role = user.roles?.join(", ") || "User";

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard />;

      case "Employees":
        return <Employees />;

      case "Departments":
        return <Departments />;

      case "Employee Accounts":
        return <EmployeeAccounts />;

      case "Leave Management":
        return <Leaves />;

      case "Attendance":
        return <Attendance />;

      case "Attendance Reports":
        return <AttendanceReports />;

      case "Payroll Management":
        return <Payroll />;

      case "Performance Management":
        return <Performance />;

      case "Recruitment Management":
        return <Recruitment />;

      case "Onboarding & Offboarding":
        return <OnboardingOffboarding />;

      case "Settings":
        return (
          <div className="ws-placeholder">
            <Settings size={35} />
            <h2>Settings</h2>
            <p>
              Account and application settings will be added here.
            </p>
          </div>
        );

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="ws-app">
      {sidebarOpen && (
        <div
          className="ws-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`ws-sidebar ${
          sidebarOpen ? "ws-sidebar-open" : ""
        }`}
      >
        <div className="ws-brand">
          <div className="ws-brand-icon">W</div>

          <div>
            <h2>WorkSphere</h2>
            <span>Employee Management</span>
          </div>

          <button
            className="ws-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ws-nav-heading">MAIN MENU</div>

        <nav className="ws-navigation">
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`ws-nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="ws-sidebar-bottom">
          <div className="ws-profile">
            <div className="ws-avatar">{initials}</div>

            <div className="ws-profile-details">
              <strong>{displayName}</strong>
              <span>{role}</span>
            </div>
          </div>

          <button
            type="button"
            className="ws-logout-button"
            onClick={logout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="ws-main">
        <header className="ws-topbar">
          <div className="ws-topbar-left">
            <button
              className="ws-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1>{activePage}</h1>
              <p>Welcome back, {displayName}</p>
            </div>
          </div>

          <div className="ws-topbar-right">
            <div className="ws-search">
              <Search size={17} />
              <input placeholder="Search..." />
            </div>

            <NotificationBell />

            <div className="ws-top-avatar">{initials}</div>
          </div>
        </header>

        <div className="ws-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
