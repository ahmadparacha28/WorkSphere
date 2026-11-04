
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  CalendarDays,
  Search,
  Building2,
  Clock,
  ArrowRight,
  X,
  Send,
  CheckCircle,
  LoaderCircle,
  FileText
} from "lucide-react";
import api from "../services/api";
import "./CareerPortal.css";

const initialForm = {
  candidateName: "",
  email: "",
  phone: "",
  coverLetter: ""
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

export default function CareerPortal({ onLogin }) {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");

  const [selectedVacancy, setSelectedVacancy] = useState(null);
  const [applicationVacancy, setApplicationVacancy] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [resumeFile, setResumeFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadVacancies();
  }, []);

  // =========================================
  // LOAD PUBLIC VACANCIES
  // =========================================

  const loadVacancies = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/JobVacancy/public");

      setVacancies(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load vacancies. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // DEPARTMENT FILTER
  // =========================================

  const departments = useMemo(() => {
    return [
      "All",
      ...new Set(
        vacancies
          .map((vacancy) => vacancy.department)
          .filter(Boolean)
      )
    ];
  }, [vacancies]);

  // =========================================
  // SEARCH AND FILTER VACANCIES
  // =========================================

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((vacancy) => {
      const text = search.toLowerCase();

      const matchesSearch =
        vacancy.title?.toLowerCase().includes(text) ||
        vacancy.department?.toLowerCase().includes(text) ||
        vacancy.location?.toLowerCase().includes(text) ||
        vacancy.description?.toLowerCase().includes(text);

      const matchesDepartment =
        department === "All" ||
        vacancy.department === department;

      return matchesSearch && matchesDepartment;
    });
  }, [vacancies, search, department]);

  // =========================================
  // OPEN VACANCY DETAILS
  // =========================================

  const openVacancy = async (id) => {
    setError("");

    try {
      const response = await api.get(
        `/JobVacancy/public/${id}`
      );

      setSelectedVacancy(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load this vacancy."
      );
    }
  };

  // =========================================
  // OPEN APPLICATION FORM
  // =========================================

  const openApplication = (vacancy) => {
    setForm(initialForm);
    setResumeFile(null);
    setSuccess("");
    setError("");

    setApplicationVacancy(vacancy);
  };

  // =========================================
  // CLOSE APPLICATION FORM
  // =========================================

  const closeApplication = () => {
    if (submitting) return;

    setApplicationVacancy(null);
    setForm(initialForm);
    setResumeFile(null);
    setError("");
    setSuccess("");
  };

  // =========================================
  // HANDLE FORM INPUTS
  // =========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // =========================================
  // HANDLE RESUME FILE
  // =========================================

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setResumeFile(null);
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      .toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(
        "Only PDF, DOC, and DOCX files are allowed."
      );

      e.target.value = "";
      setResumeFile(null);
      return;
    }

    if (file.size === 0) {
      setError("The selected resume file is empty.");

      e.target.value = "";
      setResumeFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Resume file size cannot exceed 5 MB."
      );

      e.target.value = "";
      setResumeFile(null);
      return;
    }

    setError("");
    setResumeFile(file);
  };

  // =========================================
  // REMOVE SELECTED RESUME
  // =========================================

  const removeResume = () => {
    setResumeFile(null);

    const input = document.getElementById("resumeFile");

    if (input) {
      input.value = "";
    }
  };

  // =========================================
  // SUBMIT APPLICATION WITH RESUME
  // =========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!applicationVacancy) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();

      payload.append(
        "JobVacancyId",
        applicationVacancy.id
      );

      payload.append(
        "CandidateName",
        form.candidateName.trim()
      );

      payload.append(
        "Email",
        form.email.trim()
      );

      if (form.phone.trim()) {
        payload.append(
          "Phone",
          form.phone.trim()
        );
      }

      if (form.coverLetter.trim()) {
        payload.append(
          "CoverLetter",
          form.coverLetter.trim()
        );
      }

      if (resumeFile) {
        payload.append(
          "ResumeFile",
          resumeFile
        );
      }

      const response = await api.post(
        "/JobApplication/with-resume",
        payload
      );

      setSuccess(
        response.data?.message ||
        "Your application has been submitted successfully."
      );

      setForm(initialForm);
      setResumeFile(null);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to submit your application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================
  // DATE FORMATTING
  // =========================================

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // =========================================
  // CHECK APPLICATION DEADLINE
  // =========================================

  const isDeadlinePassed = (date) => {
    if (!date) return false;

    const deadline = new Date(date);
    deadline.setHours(23, 59, 59, 999);

    return deadline < new Date();
  };

  // =========================================
  // UI
  // =========================================

  return (
    <div className="career-page">

      {/* HEADER */}

      <header className="career-header">

        <div className="career-brand">
          <div className="career-brand-icon">
            <BriefcaseBusiness size={23} />
          </div>

          <div>
            <h2>WorkSphere</h2>
            <span>Careers</span>
          </div>
        </div>

        <button
          type="button"
          className="career-login-button"
          onClick={onLogin}
        >
          Employee Login
          <ArrowRight size={17} />
        </button>

      </header>

      {/* HERO SECTION */}

      <section className="career-hero">

        <div className="career-hero-content">

          <span className="career-eyebrow">
            BUILD YOUR FUTURE WITH US
          </span>

          <h1>
            Find a career where
            <br />
            <span>you can grow.</span>
          </h1>

          <p>
            Explore opportunities at WorkSphere and become part
            of a team that values talent, innovation, and growth.
          </p>

          <a
            href="#career-openings"
            className="career-hero-link"
          >
            Explore Open Positions
            <ArrowRight size={18} />
          </a>

        </div>

        <div className="career-hero-visual">

          <div className="career-visual-card">
            <BriefcaseBusiness size={48} />

            <h3>
              Your next opportunity starts here.
            </h3>

            <p>
              Discover roles that match your skills and ambitions.
            </p>
          </div>

        </div>

      </section>

      {/* MAIN SECTION */}

      <main
        className="career-main"
        id="career-openings"
      >

        <div className="career-section-heading">

          <div>
            <span className="career-eyebrow">
              OPPORTUNITIES
            </span>

            <h2>Explore Open Positions</h2>

            <p>
              Find a role that matches your experience and interests.
            </p>
          </div>

          <div className="career-opening-count">
            <strong>{vacancies.length}</strong>
            <span>Open Positions</span>
          </div>

        </div>

        {/* SEARCH AND FILTER */}

        <div className="career-filters">

          <div className="career-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search job title, department or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            aria-label="Filter by department"
          >
            {departments.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? "All Departments"
                  : item}
              </option>
            ))}
          </select>

        </div>

        {/* ERROR MESSAGE */}

        {error && !applicationVacancy && (
          <div className="career-alert career-alert-error">
            {error}

            <button
              type="button"
              onClick={loadVacancies}
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading ? (

          <div className="career-loading">
            <LoaderCircle
              className="career-spinner"
              size={32}
            />

            <p>Loading available opportunities...</p>
          </div>

        ) : filteredVacancies.length === 0 ? (

          <div className="career-empty">
            <BriefcaseBusiness size={42} />

            <h3>No vacancies found</h3>

            <p>
              {vacancies.length === 0
                ? "There are currently no open positions. Please check again later."
                : "Try changing your search or department filter."}
            </p>
          </div>

        ) : (

          <div className="career-vacancy-grid">

            {filteredVacancies.map((vacancy) => (

              <article
                className="career-vacancy-card"
                key={vacancy.id}
              >

                <div className="career-card-top">

                  <div className="career-card-icon">
                    <BriefcaseBusiness size={22} />
                  </div>

                  <span className="career-open-label">
                    Open
                  </span>

                </div>

                <h3>{vacancy.title}</h3>

                <div className="career-department">
                  <Building2 size={15} />
                  {vacancy.department}
                </div>

                <p className="career-card-description">
                  {vacancy.description?.length > 145
                    ? `${vacancy.description.substring(0, 145)}...`
                    : vacancy.description}
                </p>

                <div className="career-card-meta">

                  <span>
                    <MapPin size={15} />
                    {vacancy.location || "Not specified"}
                  </span>

                  <span>
                    <Clock size={15} />
                    {vacancy.employmentType}
                  </span>

                </div>

                <div className="career-card-footer">

                  <button
                    type="button"
                    className="career-details-button"
                    onClick={() => openVacancy(vacancy.id)}
                  >
                    View Details
                    <ArrowRight size={16} />
                  </button>

                  <span>
                    Deadline: {formatDate(vacancy.closingDate)}
                  </span>

                </div>

              </article>

            ))}

          </div>

        )}

      </main>

      {/* FOOTER */}

      <footer className="career-footer">

        <div className="career-footer-brand">
          <BriefcaseBusiness size={19} />
          <strong>WorkSphere</strong>
        </div>

        <p>Find your place. Build your future.</p>

        <span>
          © {new Date().getFullYear()} WorkSphere. All rights reserved.
        </span>

      </footer>

      {/* =========================================
          JOB DETAILS MODAL
      ========================================= */}

      {selectedVacancy && (

        <div
          className="career-modal-backdrop"
          onClick={() => setSelectedVacancy(null)}
        >

          <div
            className="career-modal career-details-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="career-modal-header">

              <div>
                <span className="career-eyebrow">
                  JOB DETAILS
                </span>

                <h2>{selectedVacancy.title}</h2>
              </div>

              <button
                type="button"
                className="career-close-button"
                onClick={() => setSelectedVacancy(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>

            </div>

            <div className="career-detail-meta">

              <span>
                <Building2 size={16} />
                {selectedVacancy.department}
              </span>

              <span>
                <MapPin size={16} />
                {selectedVacancy.location || "Not specified"}
              </span>

              <span>
                <Clock size={16} />
                {selectedVacancy.employmentType}
              </span>

              <span>
                <CalendarDays size={16} />
                Deadline: {formatDate(selectedVacancy.closingDate)}
              </span>

            </div>

            {selectedVacancy.salaryRange && (
              <div className="career-salary">
                Salary Range:
                <strong>{selectedVacancy.salaryRange}</strong>
              </div>
            )}

            <div className="career-detail-section">
              <h3>Job Description</h3>
              <p>{selectedVacancy.description}</p>
            </div>

            {selectedVacancy.requirements && (
              <div className="career-detail-section">
                <h3>Requirements</h3>
                <p>{selectedVacancy.requirements}</p>
              </div>
            )}

            <div className="career-modal-actions">

              <button
                type="button"
                className="career-secondary-button"
                onClick={() => setSelectedVacancy(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="career-primary-button"
                disabled={isDeadlinePassed(selectedVacancy.closingDate)}
                onClick={() => {
                  const vacancy = selectedVacancy;

                  setSelectedVacancy(null);
                  openApplication(vacancy);
                }}
              >
                Apply Now
                <ArrowRight size={17} />
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================================
          APPLICATION MODAL
      ========================================= */}

      {applicationVacancy && (

        <div
          className="career-modal-backdrop"
          onClick={closeApplication}
        >

          <div
            className="career-modal career-application-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="career-modal-header">

              <div>
                <span className="career-eyebrow">
                  APPLICATION FORM
                </span>

                <h2>
                  Apply for {applicationVacancy.title}
                </h2>

                <p>{applicationVacancy.department}</p>
              </div>

              <button
                type="button"
                className="career-close-button"
                onClick={closeApplication}
                disabled={submitting}
                aria-label="Close application"
              >
                <X size={21} />
              </button>

            </div>

            {/* SUCCESS MESSAGE */}

            {success ? (

              <div className="career-success">

                <CheckCircle size={55} />

                <h3>Application Submitted!</h3>

                <p>{success}</p>

                <p>
                  Thank you for your interest in joining WorkSphere.
                </p>

                <button
                  type="button"
                  className="career-primary-button"
                  onClick={() => {
                    setApplicationVacancy(null);
                    setSuccess("");
                    setError("");
                    setForm(initialForm);
                    setResumeFile(null);
                  }}
                >
                  Done
                </button>

              </div>

            ) : (

              <form onSubmit={handleSubmit}>

                {/* APPLICATION ERROR */}

                {error && (
                  <div className="career-alert career-alert-error">
                    {error}
                  </div>
                )}

                <div className="career-form-grid">

                  {/* FULL NAME */}

                  <div className="career-form-group career-form-full">

                    <label htmlFor="candidateName">
                      Full Name *
                    </label>

                    <input
                      id="candidateName"
                      name="candidateName"
                      value={form.candidateName}
                      onChange={handleChange}
                      maxLength={150}
                      placeholder="Enter your full name"
                      required
                      disabled={submitting}
                    />

                  </div>

                  {/* EMAIL */}

                  <div className="career-form-group">

                    <label htmlFor="email">
                      Email Address *
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      maxLength={150}
                      placeholder="you@example.com"
                      required
                      disabled={submitting}
                    />

                  </div>

                  {/* PHONE */}

                  <div className="career-form-group">

                    <label htmlFor="phone">
                      Phone Number
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      maxLength={30}
                      placeholder="Enter phone number"
                      disabled={submitting}
                    />

                  </div>

                  {/* RESUME UPLOAD */}

                  <div className="career-form-group career-form-full">

                    <label htmlFor="resumeFile">
                      Upload Resume
                    </label>

                    <input
                      id="resumeFile"
                      name="resumeFile"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeChange}
                      disabled={submitting}
                    />

                    <small>
                      Accepted formats: PDF, DOC, DOCX.
                      Maximum file size: 5 MB.
                    </small>

                    {resumeFile && (

                      <div className="career-selected-file">

                        <span>
                          <FileText size={17} />
                          {resumeFile.name}
                        </span>

                        <button
                          type="button"
                          onClick={removeResume}
                          disabled={submitting}
                          aria-label="Remove selected resume"
                        >
                          <X size={16} />
                        </button>

                      </div>

                    )}

                  </div>

                  {/* COVER LETTER */}

                  <div className="career-form-group career-form-full">

                    <label htmlFor="coverLetter">
                      Cover Letter
                    </label>

                    <textarea
                      id="coverLetter"
                      name="coverLetter"
                      value={form.coverLetter}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Tell us why you are interested in this position..."
                      disabled={submitting}
                    />

                  </div>

                </div>

                {/* FORM BUTTONS */}

                <div className="career-modal-actions">

                  <button
                    type="button"
                    className="career-secondary-button"
                    onClick={closeApplication}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="career-primary-button"
                    disabled={submitting}
                  >

                    {submitting ? (

                      <>
                        <LoaderCircle
                          className="career-spinner"
                          size={17}
                        />
                        Submitting...
                      </>

                    ) : (

                      <>
                        Submit Application
                        <Send size={16} />
                      </>

                    )}

                  </button>

                </div>

              </form>

            )}

          </div>

        </div>

      )}

    </div>
  );
}
