
import { useEffect, useState } from "react";
import {
  Plus, Search, RefreshCw, Star, X, Edit, Trash2,
  CheckCircle, Lock, ClipboardCheck, Users, TrendingUp
} from "lucide-react";
import api from "../services/api";
import "./Performance.css";

const emptyCycle = {
  name: "",
  description: "",
  startDate: "",
  endDate: ""
};

const emptyReview = {
  employeeId: "",
  performanceReviewCycleId: "",
  workQualityRating: 3,
  productivityRating: 3,
  communicationRating: 3,
  teamworkRating: 3,
  punctualityRating: 3,
  strengths: "",
  areasForImprovement: "",
  managerComments: ""
};

const ratingFields = [
  ["workQualityRating", "Work Quality"],
  ["productivityRating", "Productivity"],
  ["communicationRating", "Communication"],
  ["teamworkRating", "Teamwork"],
  ["punctualityRating", "Punctuality"]
];

function Performance() {
  const [cycles, setCycles] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedCycle, setSelectedCycle] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showCycleForm, setShowCycleForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const [editingCycle, setEditingCycle] = useState(null);
  const [editingReview, setEditingReview] = useState(null);

  const [cycleForm, setCycleForm] = useState(emptyCycle);
  const [reviewForm, setReviewForm] = useState(emptyReview);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadReviews();
  }, [selectedCycle, statusFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      const [cycleResponse, employeeResponse] = await Promise.all([
        api.get("/Performance/cycles"),
        api.get("/Employee?page=1&pageSize=100")
      ]);

      const cycleData = Array.isArray(cycleResponse.data)
        ? cycleResponse.data
        : cycleResponse.data.items || [];

      const employeeData = employeeResponse.data.data || [];

      setCycles(cycleData);
      setEmployees(employeeData);

      if (cycleData.length > 0) {
        setSelectedCycle(String(cycleData[0].id));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load performance management data."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const params = {};

      if (selectedCycle) params.cycleId = selectedCycle;
      if (statusFilter !== "All") params.status = statusFilter;

      const response = await api.get("/Performance/reviews", { params });

      setReviews(
        Array.isArray(response.data)
          ? response.data
          : response.data.items || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load performance reviews."
      );
    }
  };

  const refreshData = async () => {
    await loadInitialData();
    await loadReviews();
  };

  const saveCycle = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingCycle) {
        await api.put(
          `/Performance/cycles/${editingCycle.id}`,
          cycleForm
        );
      } else {
        await api.post("/Performance/cycles", cycleForm);
      }

      setShowCycleForm(false);
      setEditingCycle(null);
      setCycleForm(emptyCycle);

      await loadInitialData();
      alert(editingCycle ? "Review cycle updated." : "Review cycle created.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save review cycle.");
    } finally {
      setSaving(false);
    }
  };

  const openEditCycle = (cycle) => {
    setEditingCycle(cycle);
    setCycleForm({
      name: cycle.name,
      description: cycle.description || "",
      startDate: cycle.startDate?.substring(0, 10),
      endDate: cycle.endDate?.substring(0, 10)
    });
    setShowCycleForm(true);
  };

  const deleteCycle = async (id) => {
    if (!window.confirm("Delete this review cycle?")) return;

    try {
      await api.delete(`/Performance/cycles/${id}`);
      await loadInitialData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete cycle.");
    }
  };

  const closeCycle = async (id) => {
    if (!window.confirm("Close this review cycle?")) return;

    try {
      await api.patch(`/Performance/cycles/${id}/close`);
      await loadInitialData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to close cycle.");
    }
  };

  const openNewReview = () => {
    setEditingReview(null);
    setReviewForm({
      ...emptyReview,
      performanceReviewCycleId: selectedCycle || ""
    });
    setShowReviewForm(true);
  };

  const openEditReview = (review) => {
    setEditingReview(review);

    setReviewForm({
      employeeId: review.employeeId,
      performanceReviewCycleId: review.performanceReviewCycleId,
      workQualityRating: review.workQualityRating,
      productivityRating: review.productivityRating,
      communicationRating: review.communicationRating,
      teamworkRating: review.teamworkRating,
      punctualityRating: review.punctualityRating,
      strengths: review.strengths || "",
      areasForImprovement: review.areasForImprovement || "",
      managerComments: review.managerComments || ""
    });

    setShowReviewForm(true);
  };

  const saveReview = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...reviewForm,
        employeeId: Number(reviewForm.employeeId),
        performanceReviewCycleId: Number(reviewForm.performanceReviewCycleId),
        workQualityRating: Number(reviewForm.workQualityRating),
        productivityRating: Number(reviewForm.productivityRating),
        communicationRating: Number(reviewForm.communicationRating),
        teamworkRating: Number(reviewForm.teamworkRating),
        punctualityRating: Number(reviewForm.punctualityRating)
      };

      if (editingReview) {
        await api.put(
          `/Performance/reviews/${editingReview.id}`,
          payload
        );
      } else {
        await api.post("/Performance/reviews", payload);
      }

      setShowReviewForm(false);
      setEditingReview(null);
      await loadReviews();

      alert(editingReview ? "Review updated." : "Draft review created.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save review.");
    } finally {
      setSaving(false);
    }
  };

  const publishReview = async (id) => {
    if (!window.confirm("Publish this review? The employee will be able to see it.")) {
      return;
    }

    try {
      await api.patch(`/Performance/reviews/${id}/publish`);
      await loadReviews();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to publish review.");
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const employeeName =
      `${review.employeeName || review.employee?.firstName || ""} ${
        review.employee?.lastName || ""
      }`.toLowerCase();

    return employeeName.includes(search.toLowerCase());
  });

  const publishedCount = reviews.filter(
    (review) => review.status === "Published"
  ).length;

  const draftCount = reviews.filter(
    (review) => review.status === "Draft"
  ).length;

  const averageRating = reviews.length
    ? (
        reviews.reduce(
          (total, review) => total + Number(review.overallRating || 0),
          0
        ) / reviews.length
      ).toFixed(2)
    : "0.00";

  const getEmployeeName = (review) => {
    if (review.employeeName) return review.employeeName;

    return review.employee
      ? `${review.employee.firstName} ${review.employee.lastName}`
      : `Employee #${review.employeeId}`;
  };

  if (loading) {
    return <div className="performance-loading">Loading performance management...</div>;
  }

  return (
    <div className="performance-page">
      <div className="performance-header">
        <div>
          <h1>Performance Management</h1>
          <p>Manage employee evaluations and performance reviews.</p>
        </div>

        <button className="performance-refresh" onClick={refreshData}>
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      {error && (
        <div className="performance-error">
          {error}
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}

      <div className="performance-stats">
        <div className="performance-stat-card">
          <div className="performance-stat-icon blue"><ClipboardCheck /></div>
          <div><span>Total Reviews</span><h2>{reviews.length}</h2></div>
        </div>

        <div className="performance-stat-card">
          <div className="performance-stat-icon green"><CheckCircle /></div>
          <div><span>Published Reviews</span><h2>{publishedCount}</h2></div>
        </div>

        <div className="performance-stat-card">
          <div className="performance-stat-icon orange"><Users /></div>
          <div><span>Draft Reviews</span><h2>{draftCount}</h2></div>
        </div>

        <div className="performance-stat-card">
          <div className="performance-stat-icon purple"><TrendingUp /></div>
          <div><span>Average Rating</span><h2>{averageRating}/5</h2></div>
        </div>
      </div>

      <section className="performance-section">
        <div className="performance-section-header">
          <div>
            <h2>Review Cycles</h2>
            <p>Create and manage employee evaluation periods.</p>
          </div>

          <button
            className="performance-primary-btn"
            onClick={() => {
              setEditingCycle(null);
              setCycleForm(emptyCycle);
              setShowCycleForm(true);
            }}
          >
            <Plus size={17} /> New Cycle
          </button>
        </div>

        {cycles.length === 0 ? (
          <div className="performance-empty">
            No review cycles created yet. Create your first cycle.
          </div>
        ) : (
          <div className="cycle-grid">
            {cycles.map((cycle) => (
              <div className="cycle-card" key={cycle.id}>
                <div className="cycle-card-top">
                  <h3>{cycle.name}</h3>
                  <span className={`performance-status ${cycle.status?.toLowerCase()}`}>
                    {cycle.status}
                  </span>
                </div>

                <p>{cycle.description || "No description provided."}</p>

                <div className="cycle-dates">
                  <span>Start: {new Date(cycle.startDate).toLocaleDateString()}</span>
                  <span>End: {new Date(cycle.endDate).toLocaleDateString()}</span>
                </div>

                <div className="cycle-count">
                  {cycle.totalReviews || 0} reviews · {cycle.publishedReviews || 0} published
                </div>

                <div className="cycle-actions">
                  <button onClick={() => setSelectedCycle(String(cycle.id))}>
                    View Reviews
                  </button>
                  <button onClick={() => openEditCycle(cycle)} title="Edit">
                    <Edit size={16} />
                  </button>
                  {cycle.status !== "Closed" && (
                    <button onClick={() => closeCycle(cycle.id)} title="Close cycle">
                      <Lock size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteCycle(cycle.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="performance-section">
        <div className="performance-section-header">
          <div>
            <h2>Employee Reviews</h2>
            <p>Create, evaluate, and publish performance reviews.</p>
          </div>

          <button
            className="performance-primary-btn"
            onClick={openNewReview}
            disabled={!cycles.some(c => c.status === "Active")}
          >
            <Plus size={17} /> New Review
          </button>
        </div>

        <div className="performance-filters">
          <div className="performance-search">
            <Search size={17} />
            <input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
          >
            <option value="">All Review Cycles</option>
            {cycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </select>
        </div>

        <div className="performance-table-wrapper">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Review Cycle</th>
                <th>Overall Rating</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="performance-no-data">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                filteredReviews.map(review => (
                  <tr key={review.id}>
                    <td>
                      <strong>{getEmployeeName(review)}</strong>
                      <small>{review.employee?.department?.name || ""}</small>
                    </td>
                    <td>{review.cycleName || review.performanceReviewCycle?.name || "—"}</td>
                    <td>
                      <span className="rating-value">
                        <Star size={15} fill="currentColor" />
                        {Number(review.overallRating).toFixed(2)}/5
                      </span>
                    </td>
                    <td>
                      <span className={`performance-status ${review.status?.toLowerCase()}`}>
                        {review.status}
                      </span>
                    </td>
                    <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="review-actions">
                        {review.status === "Draft" && (
                          <>
                            <button onClick={() => openEditReview(review)} title="Edit review">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => publishReview(review.id)} title="Publish review">
                              <CheckCircle size={17} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCycleForm && (
        <div className="performance-modal-overlay">
          <form className="performance-modal" onSubmit={saveCycle}>
            <div className="performance-modal-header">
              <h2>{editingCycle ? "Edit Review Cycle" : "Create Review Cycle"}</h2>
              <button type="button" onClick={() => setShowCycleForm(false)}><X /></button>
            </div>

            <label>Cycle Name *</label>
            <input
              required
              maxLength="150"
              value={cycleForm.name}
              onChange={e => setCycleForm({...cycleForm, name: e.target.value})}
              placeholder="e.g. Annual Review 2026"
            />

            <label>Description</label>
            <textarea
              maxLength="500"
              value={cycleForm.description}
              onChange={e => setCycleForm({...cycleForm, description: e.target.value})}
              placeholder="Describe this review cycle..."
            />

            <div className="performance-form-row">
              <div>
                <label>Start Date *</label>
                <input
                  type="date"
                  required
                  value={cycleForm.startDate}
                  onChange={e => setCycleForm({...cycleForm, startDate: e.target.value})}
                />
              </div>
              <div>
                <label>End Date *</label>
                <input
                  type="date"
                  required
                  min={cycleForm.startDate}
                  value={cycleForm.endDate}
                  onChange={e => setCycleForm({...cycleForm, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="performance-modal-actions">
              <button type="button" onClick={() => setShowCycleForm(false)}>Cancel</button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Cycle"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showReviewForm && (
        <div className="performance-modal-overlay">
          <form className="performance-modal performance-review-modal" onSubmit={saveReview}>
            <div className="performance-modal-header">
              <h2>{editingReview ? "Edit Performance Review" : "Create Performance Review"}</h2>
              <button type="button" onClick={() => setShowReviewForm(false)}><X /></button>
            </div>

            {!editingReview && (
              <>
                <label>Employee *</label>
                <select
                  required
                  value={reviewForm.employeeId}
                  onChange={e => setReviewForm({...reviewForm, employeeId: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label>Review Cycle *</label>
            <select
              required
              value={reviewForm.performanceReviewCycleId}
              onChange={e => setReviewForm({...reviewForm, performanceReviewCycleId: e.target.value})}
              disabled={!!editingReview}
            >
              <option value="">Select Cycle</option>
              {cycles.filter(c => c.status === "Active").map(cycle => (
                <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
              ))}
            </select>

            <h3 className="rating-section-title">Performance Ratings</h3>

            <div className="rating-fields">
              {ratingFields.map(([field, label]) => (
                <div className="rating-field" key={field}>
                  <label>{label}</label>
                  <select
                    value={reviewForm[field]}
                    onChange={e => setReviewForm({...reviewForm, [field]: Number(e.target.value)})}
                  >
                    {[1, 2, 3, 4, 5].map(value => (
                      <option key={value} value={value}>
                        {value} — {["", "Poor", "Below Average", "Average", "Good", "Excellent"][value]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <label>Strengths</label>
            <textarea
              maxLength="2000"
              value={reviewForm.strengths}
              onChange={e => setReviewForm({...reviewForm, strengths: e.target.value})}
              placeholder="Describe employee strengths..."
            />

            <label>Areas for Improvement</label>
            <textarea
              maxLength="2000"
              value={reviewForm.areasForImprovement}
              onChange={e => setReviewForm({...reviewForm, areasForImprovement: e.target.value})}
              placeholder="Identify areas for improvement..."
            />

            <label>Manager Comments</label>
            <textarea
              maxLength="2000"
              value={reviewForm.managerComments}
              onChange={e => setReviewForm({...reviewForm, managerComments: e.target.value})}
              placeholder="Additional manager feedback..."
            />

            <div className="performance-modal-actions">
              <button type="button" onClick={() => setShowReviewForm(false)}>Cancel</button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Performance;
