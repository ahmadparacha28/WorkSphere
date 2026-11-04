
import { useEffect, useState } from "react";
import { User, Mail, Phone, Briefcase, Building2, CalendarDays, RefreshCw } from "lucide-react";
import api from "../services/api";
import "./EmployeeProfile.css";

export default function EmployeeProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/EmployeeProfile/me");
      setProfile(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return <div className="profile-message">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="profile-error">
        <p>{error}</p>
        <button onClick={fetchProfile}>
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  const details = [
    { label: "First Name", value: profile.firstName, icon: User },
    { label: "Last Name", value: profile.lastName, icon: User },
    { label: "Email Address", value: profile.email, icon: Mail },
    { label: "Phone Number", value: profile.phone, icon: Phone },
    { label: "Position", value: profile.position, icon: Briefcase },
    { label: "Department", value: profile.departmentName, icon: Building2 },
    {
      label: "Hire Date",
      value: profile.hireDate
        ? new Date(profile.hireDate).toLocaleDateString()
        : "Not available",
      icon: CalendarDays
    }
  ];

  return (
    <div className="employee-profile">
      <div className="profile-heading">
        <div>
          <h2>My Profile</h2>
          <p>View your personal and employment information.</p>
        </div>

        <button className="profile-refresh" onClick={fetchProfile}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          {profile.firstName?.charAt(0)}
          {profile.lastName?.charAt(0)}
        </div>

        <h3>{profile.fullName}</h3>
        <p>{profile.position}</p>
        <span>{profile.departmentName}</span>
      </div>

      <div className="profile-details">
        <h3>Employment Information</h3>

        <div className="profile-details-grid">
          {details.map((item) => {
            const Icon = item.icon;

            return (
              <div className="profile-detail-item" key={item.label}>
                <div className="profile-detail-icon">
                  <Icon size={19} />
                </div>

                <div>
                  <small>{item.label}</small>
                  <p>{item.value || "Not available"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="profile-note">
        To update your employee information, please contact your HR administrator.
      </p>
    </div>
  );
}
