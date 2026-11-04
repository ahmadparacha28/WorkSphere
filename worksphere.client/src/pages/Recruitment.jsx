import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Users,
  CalendarDays,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  X,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Search,
  Download
} from "lucide-react";
import api from "../services/api";
import "./Recruitment.css";

const emptyVacancy = {
  title: "",
  description: "",
  department: "",
  employmentType: "Full-Time",
  location: "",
  salaryRange: "",
  requirements: "",
  closingDate: ""
};

const emptyInterview = {
  jobApplicationId: "",
  scheduledAt: "",
  interviewType: "Technical",
  interviewerName: "",
  location: "",
  notes: ""
};

const applicationStatuses = [
  "Applied",
  "UnderReview",
  "Shortlisted",
  "Rejected",
  "Hired"
];

const interviewStatuses = [
  "Scheduled",
  "Completed",
  "Cancelled"
];

function Recruitment() {
  const [activeTab, setActiveTab] = useState("vacancies");
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [vacancyModal, setVacancyModal] = useState(false);
  const [vacancyForm, setVacancyForm] = useState(emptyVacancy);
  const [editingVacancy, setEditingVacancy] = useState(null);

  const [interviewModal, setInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [editingInterview, setEditingInterview] = useState(null);

  const [selectedApplication, setSelectedApplication] = useState(null);

  const [downloadingResume, setDownloadingResume] = useState(false);

const downloadResume = async (application) => {
  try {
    setDownloadingResume(true);
    setError("");

    const response = await api.get(
      `/JobApplication/${application.id}/resume`,
      { responseType: "blob" }
    );

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "application/octet-stream"
    });

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    const extension = application.resumeUrl
      ?.split(".")
      .pop()
      ?.toLowerCase();

    const allowedExtensions = ["pdf", "doc", "docx"];
    const fileExtension = allowedExtensions.includes(extension)
      ? `.${extension}`
      : "";

    link.href = blobUrl;
    link.download = `Resume-${application.id}${fileExtension}`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(blobUrl);

    showNotice("Resume downloaded successfully.");
  } catch (err) {
    setError(
      getErrorMessage(err, "Unable to download resume. Please check your permissions.")
    );
  } finally {
    setDownloadingResume(false);
  }
};

  const getErrorMessage = (err, fallback) =>
    err.response?.data?.message ||
    err.response?.data?.title ||
    fallback;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        api.get("/JobVacancy"),
        api.get("/JobApplication"),
        api.get("/JobInterview")
      ]);

      const [vacancyResult, applicationResult, interviewResult] = results;

      if (vacancyResult.status === "fulfilled") {
        setVacancies(Array.isArray(vacancyResult.value.data)
          ? vacancyResult.value.data : []);
      } else {
        throw vacancyResult.reason;
      }

      if (applicationResult.status === "fulfilled") {
        setApplications(Array.isArray(applicationResult.value.data)
          ? applicationResult.value.data : []);
      } else {
        throw applicationResult.reason;
      }

      if (interviewResult.status === "fulfilled") {
        setInterviews(Array.isArray(interviewResult.value.data)
          ? interviewResult.value.data : []);
      } else {
        throw interviewResult.reason;
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load recruitment data. Please check your connection and permissions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotice = (message) => {
    setNotice(message);
    setError("");
  };

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const toDateTimeLocal = (value) => {
    if (!value) return "";

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  };

  // =========================================
  // VACANCY MANAGEMENT
  // =========================================

  const openCreateVacancy = () => {
    setEditingVacancy(null);
    setVacancyForm(emptyVacancy);
    setVacancyModal(true);
  };

  const openEditVacancy = (vacancy) => {
    setEditingVacancy(vacancy.id);
    setVacancyForm({
      title: vacancy.title || "",
      description: vacancy.description || "",
      department: vacancy.department || "",
      employmentType: vacancy.employmentType || "Full-Time",
      location: vacancy.location || "",
      salaryRange: vacancy.salaryRange || "",
      requirements: vacancy.requirements || "",
      closingDate: vacancy.closingDate
        ? vacancy.closingDate.slice(0, 10)
        : ""
    });
    setVacancyModal(true);
  };

  const handleVacancySubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...vacancyForm,
        closingDate: vacancyForm.closingDate
          ? new Date(`${vacancyForm.closingDate}T23:59:00`).toISOString()
          : null
      };

      if (editingVacancy) {
        await api.put(`/JobVacancy/${editingVacancy}`, payload);
        showNotice("Job vacancy updated successfully.");
      } else {
        await api.post("/JobVacancy", payload);
        showNotice("Job vacancy created successfully.");
      }

      setVacancyModal(false);
      setVacancyForm(emptyVacancy);
      setEditingVacancy(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save job vacancy."));
    }
  };

  const closeVacancy = async (id) => {
    if (!window.confirm("Are you sure you want to close this vacancy?")) return;

    try {
      await api.patch(`/JobVacancy/${id}/close`);
      showNotice("Job vacancy closed successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to close vacancy."));
    }
  };

  const deleteVacancy = async (id) => {
    if (!window.confirm("Delete this vacancy and all its associated applications and interviews? This action cannot be undone.")) return;

    try {
      await api.delete(`/JobVacancy/${id}`);
      showNotice("Job vacancy deleted successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete vacancy."));
    }
  };

  const viewVacancyApplications = (vacancyId) => {
    setActiveTab("applications");
    setSearchTerm("");
    setStatusFilter("All");
    setSelectedApplication(null);
    // The applications list can be narrowed using the search field.
    setSearchTerm(String(vacancyId));
  };

  // =========================================
  // APPLICATION MANAGEMENT
  // =========================================

  const updateApplicationStatus = async (id, status) => {
    try {
      await api.patch(`/JobApplication/${id}/status`, { status });
      showNotice("Candidate application status updated.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update application status."));
    }
  };

  // =========================================
  // INTERVIEW MANAGEMENT
  // =========================================

  const openCreateInterview = (applicationId = "") => {
    setEditingInterview(null);
    setInterviewForm({
      ...emptyInterview,
      jobApplicationId: applicationId ? String(applicationId) : ""
    });
    setInterviewModal(true);
  };

  const openEditInterview = (interview) => {
    setEditingInterview(interview.id);
    setInterviewForm({
      jobApplicationId: String(interview.jobApplicationId),
      scheduledAt: toDateTimeLocal(interview.scheduledAt),
      interviewType: interview.interviewType || "Technical",
      interviewerName: interview.interviewerName || "",
      location: interview.location || "",
      notes: interview.notes || ""
    });
    setInterviewModal(true);
  };

  const handleInterviewSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        jobApplicationId: Number(interviewForm.jobApplicationId),
        scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
        interviewType: interviewForm.interviewType,
        interviewerName: interviewForm.interviewerName,
        location: interviewForm.location,
        notes: interviewForm.notes
      };

      if (editingInterview) {
        await api.put(`/JobInterview/${editingInterview}`, payload);
        showNotice("Interview updated successfully.");
      } else {
        await api.post("/JobInterview", payload);
        showNotice("Interview scheduled successfully.");
      }

      setInterviewModal(false);
      setInterviewForm(emptyInterview);
      setEditingInterview(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save interview."));
    }
  };

  const updateInterviewStatus = async (id, status) => {
    try {
      await api.patch(`/JobInterview/${id}/status`, { status });
      showNotice("Interview status updated.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update interview status."));
    }
  };

  const deleteInterview = async (id) => {
    if (!window.confirm("Are you sure you want to delete this interview?")) return;

    try {
      await api.delete(`/JobInterview/${id}`);
      showNotice("Interview deleted successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete interview."));
    }
  };

  // =========================================
  // FILTERING
  // =========================================

  const filteredVacancies = vacancies.filter(v => {
    const search = searchTerm.toLowerCase();

    return (
      (v.title || "").toLowerCase().includes(search) ||
      (v.department || "").toLowerCase().includes(search) ||
      (v.location || "").toLowerCase().includes(search)
    );
  });

  const filteredApplications = applications.filter(a => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (a.candidateName || "").toLowerCase().includes(search) ||
      (a.email || "").toLowerCase().includes(search) ||
      (a.jobTitle || "").toLowerCase().includes(search) ||
      (String(a.jobVacancyId) === search);

    const matchesStatus =
      statusFilter === "All" || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredInterviews = interviews.filter(i => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (i.candidateName || "").toLowerCase().includes(search) ||
      (i.jobTitle || "").toLowerCase().includes(search) ||
      (i.interviewerName || "").toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" || i.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openVacancies = vacancies.filter(v => v.status === "Open").length;
  const scheduledInterviews = interviews.filter(i => i.status === "Scheduled").length;

  const statusClass = (status) =>
    (status || "").toLowerCase().replace(/\s+/g, "-");

  if (loading) {
    return (
      <div className="recruitment-loading">
        <RefreshCw className="recruitment-spin" size={22} />
        Loading recruitment data...
      </div>
    );
  }

  return (
    <div className="recruitment-page">
      <div className="recruitment-header">
        <div>
          <span className="recruitment-eyebrow">HUMAN RESOURCES</span>
          <h1>Recruitment Management</h1>
          <p>Manage job openings, candidate applications, and interviews.</p>
        </div>

        <button className="recruitment-refresh-btn" onClick={loadData}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="recruitment-alert error">
          <span>{error}</span>
          <button onClick={() => setError("")}><X size={17} /></button>
        </div>
      )}

      {notice && (
        <div className="recruitment-alert success">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}><X size={17} /></button>
        </div>
      )}

      <div className="recruitment-stats">
        <div className="recruitment-stat-card">
          <div className="recruitment-stat-icon blue">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <span>Total Vacancies</span>
            <h2>{vacancies.length}</h2>
          </div>
        </div>

        <div className="recruitment-stat-card">
          <div className="recruitment-stat-icon green">
            <CheckCircle size={22} />
          </div>
          <div>
            <span>Open Vacancies</span>
            <h2>{openVacancies}</h2>
          </div>
        </div>

        <div className="recruitment-stat-card">
          <div className="recruitment-stat-icon purple">
            <Users size={22} />
          </div>
          <div>
            <span>Applications</span>
            <h2>{applications.length}</h2>
          </div>
        </div>

        <div className="recruitment-stat-card">
          <div className="recruitment-stat-icon orange">
            <CalendarDays size={22} />
          </div>
          <div>
            <span>Scheduled Interviews</span>
            <h2>{scheduledInterviews}</h2>
          </div>
        </div>
      </div>

      <div className="recruitment-tabs">
        <button
          className={activeTab === "vacancies" ? "active" : ""}
          onClick={() => {
            setActiveTab("vacancies");
            setSearchTerm("");
            setStatusFilter("All");
          }}
        >
          <BriefcaseBusiness size={17} />
          Job Vacancies
        </button>

        <button
          className={activeTab === "applications" ? "active" : ""}
          onClick={() => {
            setActiveTab("applications");
            setSearchTerm("");
            setStatusFilter("All");
          }}
        >
          <Users size={17} />
          Applications
        </button>

        <button
          className={activeTab === "interviews" ? "active" : ""}
          onClick={() => {
            setActiveTab("interviews");
            setSearchTerm("");
            setStatusFilter("All");
          }}
        >
          <CalendarDays size={17} />
          Interviews
        </button>
      </div>

      <section className="recruitment-panel">
        <div className="recruitment-panel-toolbar">
          <div>
            <h2>
              {activeTab === "vacancies" && "Job Vacancies"}
              {activeTab === "applications" && "Candidate Applications"}
              {activeTab === "interviews" && "Interview Schedule"}
            </h2>
            <p>
              {activeTab === "vacancies" && "Create and manage available job positions."}
              {activeTab === "applications" && "Review candidates and manage application progress."}
              {activeTab === "interviews" && "Schedule and manage candidate interviews."}
            </p>
          </div>

          {activeTab === "vacancies" && (
            <button className="recruitment-primary-btn" onClick={openCreateVacancy}>
              <Plus size={17} />
              Add Vacancy
            </button>
          )}

          {activeTab === "interviews" && (
            <button
              className="recruitment-primary-btn"
              onClick={() => openCreateInterview()}
              disabled={applications.length === 0}
            >
              <Plus size={17} />
              Schedule Interview
            </button>
          )}
        </div>

        <div className="recruitment-filters">
          <div className="recruitment-search">
            <Search size={17} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === "vacancies"
                  ? "Search vacancies..."
                  : activeTab === "applications"
                    ? "Search candidates, email, or job..."
                    : "Search interviews..."
              }
            />
          </div>

          {activeTab !== "vacancies" && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              {(activeTab === "applications"
                ? applicationStatuses
                : interviewStatuses
              ).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          )}
        </div>

        {/* VACANCIES TABLE */}
        {activeTab === "vacancies" && (
          <div className="recruitment-table-wrap">
            <table className="recruitment-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Employment</th>
                  <th>Location</th>
                  <th>Applications</th>
                  <th>Status</th>
                  <th>Closing Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVacancies.map(vacancy => (
                  <tr key={vacancy.id}>
                    <td>
                      <strong>{vacancy.title}</strong>
                      <small>Posted {formatDate(vacancy.postedAt)}</small>
                    </td>
                    <td>{vacancy.department}</td>
                    <td>{vacancy.employmentType}</td>
                    <td>{vacancy.location || "—"}</td>
                    <td>
                      <button
                        className="recruitment-count-link"
                        onClick={() => viewVacancyApplications(vacancy.id)}
                      >
                        {vacancy.applicationCount ?? 0} applications
                      </button>
                    </td>
                    <td>
                      <span className={`recruitment-status ${statusClass(vacancy.status)}`}>
                        {vacancy.status}
                      </span>
                    </td>
                    <td>{formatDate(vacancy.closingDate)}</td>
                    <td>
                      <div className="recruitment-actions">
                        {vacancy.status === "Open" && (
                          <>
                            <button title="Edit vacancy" onClick={() => openEditVacancy(vacancy)}>
                              <Edit size={16} />
                            </button>
                            <button title="Close vacancy" onClick={() => closeVacancy(vacancy.id)}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          className="danger"
                          title="Delete vacancy"
                          onClick={() => deleteVacancy(vacancy.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredVacancies.length === 0 && (
                  <tr>
                    <td colSpan="8" className="recruitment-empty-row">
                      No job vacancies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* APPLICATIONS TABLE */}
        {activeTab === "applications" && (
          <div className="recruitment-table-wrap">
            <table className="recruitment-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Position</th>
                  <th>Contact</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(application => (
                  <tr key={application.id}>
                    <td>
                      <strong>{application.candidateName}</strong>
                      <small>Application #{application.id}</small>
                    </td>
                    <td>{application.jobTitle || `Vacancy #${application.jobVacancyId}`}</td>
                    <td>
                      {application.email}
                      <small>{application.phone || "No phone provided"}</small>
                    </td>
                    <td>{formatDate(application.appliedAt)}</td>
                    <td>
                      <select
                        className={`recruitment-status-select ${statusClass(application.status)}`}
                        value={application.status}
                        onChange={e => updateApplicationStatus(application.id, e.target.value)}
                      >
                        {applicationStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="recruitment-actions">
                        <button
                          title="View candidate details"
                          onClick={() => setSelectedApplication(application)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          title="Schedule interview"
                          onClick={() => openCreateInterview(application.id)}
                          disabled={["Rejected", "Hired"].includes(application.status)}
                        >
                          <CalendarDays size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredApplications.length === 0 && (
                  <tr>
                    <td colSpan="6" className="recruitment-empty-row">
                      No candidate applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* INTERVIEWS TABLE */}
        {activeTab === "interviews" && (
          <div className="recruitment-table-wrap">
            <table className="recruitment-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Interview Date</th>
                  <th>Type</th>
                  <th>Interviewer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.map(interview => (
                  <tr key={interview.id}>
                    <td>
                      <strong>{interview.candidateName}</strong>
                      <small>{interview.candidateEmail}</small>
                    </td>
                    <td>{interview.jobTitle}</td>
                    <td>{formatDateTime(interview.scheduledAt)}</td>
                    <td>{interview.interviewType}</td>
                    <td>{interview.interviewerName}</td>
                    <td>
                      <select
                        className={`recruitment-status-select ${statusClass(interview.status)}`}
                        value={interview.status}
                        onChange={e => updateInterviewStatus(interview.id, e.target.value)}
                      >
                        {interviewStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="recruitment-actions">
                        {!["Cancelled", "Completed"].includes(interview.status) && (
                          <button
                            title="Edit interview"
                            onClick={() => openEditInterview(interview)}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        <button
                          className="danger"
                          title="Delete interview"
                          onClick={() => deleteInterview(interview.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredInterviews.length === 0 && (
                  <tr>
                    <td colSpan="7" className="recruitment-empty-row">
                      No interviews found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* VACANCY MODAL */}
      {vacancyModal && (
        <div className="recruitment-modal-backdrop">
          <div className="recruitment-modal">
            <div className="recruitment-modal-header">
              <div>
                <h2>{editingVacancy ? "Edit Job Vacancy" : "Create Job Vacancy"}</h2>
                <p>Enter the job position details below.</p>
              </div>
              <button onClick={() => setVacancyModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleVacancySubmit}>
              <div className="recruitment-form-grid">
                <label>
                  Job Title *
                  <input
                    required
                    maxLength="150"
                    value={vacancyForm.title}
                    onChange={e => setVacancyForm({ ...vacancyForm, title: e.target.value })}
                    placeholder="e.g. Junior .NET Developer"
                  />
                </label>

                <label>
                  Department *
                  <input
                    required
                    maxLength="100"
                    value={vacancyForm.department}
                    onChange={e => setVacancyForm({ ...vacancyForm, department: e.target.value })}
                    placeholder="e.g. IT"
                  />
                </label>

                <label>
                  Employment Type *
                  <select
                    required
                    value={vacancyForm.employmentType}
                    onChange={e => setVacancyForm({ ...vacancyForm, employmentType: e.target.value })}
                  >
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                    <option>Remote</option>
                  </select>
                </label>

                <label>
                  Location
                  <input
                    maxLength="150"
                    value={vacancyForm.location}
                    onChange={e => setVacancyForm({ ...vacancyForm, location: e.target.value })}
                    placeholder="e.g. Islamabad"
                  />
                </label>

                <label>
                  Salary Range
                  <input
                    maxLength="100"
                    value={vacancyForm.salaryRange}
                    onChange={e => setVacancyForm({ ...vacancyForm, salaryRange: e.target.value })}
                    placeholder="e.g. PKR 60,000 - 90,000"
                  />
                </label>

                <label>
                  Closing Date
                  <input
                    type="date"
                    value={vacancyForm.closingDate}
                    onChange={e => setVacancyForm({ ...vacancyForm, closingDate: e.target.value })}
                  />
                </label>

                <label className="full-width">
                  Job Description *
                  <textarea
                    required
                    rows="4"
                    value={vacancyForm.description}
                    onChange={e => setVacancyForm({ ...vacancyForm, description: e.target.value })}
                    placeholder="Describe the role and responsibilities..."
                  />
                </label>

                <label className="full-width">
                  Requirements
                  <textarea
                    rows="3"
                    value={vacancyForm.requirements}
                    onChange={e => setVacancyForm({ ...vacancyForm, requirements: e.target.value })}
                    placeholder="List required skills, qualifications, and experience..."
                  />
                </label>
              </div>

              <div className="recruitment-modal-actions">
                <button type="button" className="recruitment-cancel-btn" onClick={() => setVacancyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="recruitment-primary-btn">
                  {editingVacancy ? "Save Changes" : "Create Vacancy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERVIEW MODAL */}
      {interviewModal && (
        <div className="recruitment-modal-backdrop">
          <div className="recruitment-modal">
            <div className="recruitment-modal-header">
              <div>
                <h2>{editingInterview ? "Edit Interview" : "Schedule Interview"}</h2>
                <p>Enter the candidate interview details.</p>
              </div>
              <button onClick={() => setInterviewModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleInterviewSubmit}>
              <div className="recruitment-form-grid">
                <label className="full-width">
                  Candidate Application *
                  <select
                    required
                    disabled={Boolean(editingInterview)}
                    value={interviewForm.jobApplicationId}
                    onChange={e => setInterviewForm({ ...interviewForm, jobApplicationId: e.target.value })}
                  >
                    <option value="">Select a candidate</option>
                    {applications
                      .filter(a => !["Rejected", "Hired"].includes(a.status))
                      .map(application => (
                        <option key={application.id} value={application.id}>
                          {application.candidateName} — {application.jobTitle || `Vacancy #${application.jobVacancyId}`}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Date and Time *
                  <input
                    type="datetime-local"
                    required
                    value={interviewForm.scheduledAt}
                    onChange={e => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
                  />
                </label>

                <label>
                  Interview Type *
                  <select
                    required
                    value={interviewForm.interviewType}
                    onChange={e => setInterviewForm({ ...interviewForm, interviewType: e.target.value })}
                  >
                    <option>Technical</option>
                    <option>HR</option>
                    <option>Behavioral</option>
                    <option>Final</option>
                    <option>Online</option>
                  </select>
                </label>

                <label>
                  Interviewer Name *
                  <input
                    required
                    maxLength="150"
                    value={interviewForm.interviewerName}
                    onChange={e => setInterviewForm({ ...interviewForm, interviewerName: e.target.value })}
                    placeholder="Enter interviewer name"
                  />
                </label>

                <label>
                  Location
                  <input
                    maxLength="200"
                    value={interviewForm.location}
                    onChange={e => setInterviewForm({ ...interviewForm, location: e.target.value })}
                    placeholder="Office address or meeting link"
                  />
                </label>

                <label className="full-width">
                  Notes
                  <textarea
                    rows="3"
                    value={interviewForm.notes}
                    onChange={e => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                    placeholder="Additional interview instructions..."
                  />
                </label>
              </div>

              <div className="recruitment-modal-actions">
                <button type="button" className="recruitment-cancel-btn" onClick={() => setInterviewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="recruitment-primary-btn">
                  {editingInterview ? "Save Changes" : "Schedule Interview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLICATION DETAILS MODAL */}
      {selectedApplication && (
        <div className="recruitment-modal-backdrop">
          <div className="recruitment-modal">
            <div className="recruitment-modal-header">
              <div>
                <h2>Candidate Details</h2>
                <p>Application #{selectedApplication.id}</p>
              </div>
              <button onClick={() => setSelectedApplication(null)}><X size={20} /></button>
            </div>

            <div className="recruitment-candidate-details">
              <div>
                <span>Candidate Name</span>
                <strong>{selectedApplication.candidateName}</strong>
              </div>
              <div>
                <span>Email Address</span>
                <strong>{selectedApplication.email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{selectedApplication.phone || "Not provided"}</strong>
              </div>
              <div>
                <span>Applied For</span>
                <strong>{selectedApplication.jobTitle || `Vacancy #${selectedApplication.jobVacancyId}`}</strong>
              </div>
              <div>
                <span>Application Date</span>
                <strong>{formatDate(selectedApplication.appliedAt)}</strong>
              </div>
              <div>
                <span>Current Status</span>
                <strong>{selectedApplication.status}</strong>
              </div>

              <div className="full-width">
  <span>Candidate Resume</span>

  {selectedApplication.resumeUrl ? (
    selectedApplication.resumeUrl.startsWith("http://") ||
    selectedApplication.resumeUrl.startsWith("https://") ? (
      <a
        href={selectedApplication.resumeUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        View External Resume
      </a>
    ) : (
      <button
        type="button"
        className="recruitment-primary-btn"
        onClick={() => downloadResume(selectedApplication)}
        disabled={downloadingResume}
      >
        <Download size={16} />
        {downloadingResume ? "Downloading..." : "Download Resume"}
      </button>
    )
  ) : (
    <strong>No resume uploaded</strong>
  )}
</div>

              <div className="full-width">
                <span>Cover Letter</span>
                <p>{selectedApplication.coverLetter || "No cover letter provided."}</p>
              </div>
            </div>

            <div className="recruitment-modal-actions">
              <button className="recruitment-cancel-btn" onClick={() => setSelectedApplication(null)}>
                Close
              </button>
              <button
                className="recruitment-primary-btn"
                disabled={["Rejected", "Hired"].includes(selectedApplication.status)}
                onClick={() => {
                  const id = selectedApplication.id;
                  setSelectedApplication(null);
                  openCreateInterview(id);
                }}
              >
                <CalendarDays size={16} />
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recruitment;