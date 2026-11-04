
import { useEffect, useState } from "react";
import {
  Award,
  Star,
  RefreshCw,
  ClipboardCheck,
  CalendarDays,
  MessageSquare,
  TrendingUp
} from "lucide-react";
import api from "../services/api";
import "./EmployeePerformance.css";

const ratingFields = [
  ["workQualityRating", "Work Quality"],
  ["productivityRating", "Productivity"],
  ["communicationRating", "Communication"],
  ["teamworkRating", "Teamwork"],
  ["punctualityRating", "Punctuality"]
];

function EmployeePerformance() {
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/EmployeePerformance/reviews");
      const data = Array.isArray(response.data) ? response.data : [];

      setReviews(data);

      if (selectedReview) {
        const updated = data.find(review => review.id === selectedReview.id);
        setSelectedReview(updated || null);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.title ||
        "Unable to load your performance reviews."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const averageRating = reviews.length
    ? (
        reviews.reduce(
          (total, review) => total + Number(review.overallRating || 0),
          0
        ) / reviews.length
      ).toFixed(2)
    : "0.00";

  const renderStars = (rating) => (
    <span className="employee-performance-stars">
      {[1, 2, 3, 4, 5].map(number => (
        <Star
          key={number}
          size={15}
          fill={number <= Number(rating) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );

  if (loading) {
    return (
      <div className="employee-performance-loading">
        Loading your performance reviews...
      </div>
    );
  }

  return (
    <div className="employee-performance">
      <div className="employee-performance-header">
        <div>
          <span className="employee-performance-eyebrow">
            EMPLOYEE DEVELOPMENT
          </span>
          <h1>My Performance</h1>
          <p>View your published performance evaluations and feedback.</p>
        </div>

        <button
          className="employee-performance-refresh"
          onClick={loadReviews}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="employee-performance-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="employee-performance-stats">
        <div className="employee-performance-stat">
          <div className="employee-performance-stat-icon blue">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <span>Published Reviews</span>
            <h2>{reviews.length}</h2>
          </div>
        </div>

        <div className="employee-performance-stat">
          <div className="employee-performance-stat-icon purple">
            <Award size={22} />
          </div>
          <div>
            <span>Average Rating</span>
            <h2>{averageRating}/5</h2>
          </div>
        </div>

        <div className="employee-performance-stat">
          <div className="employee-performance-stat-icon green">
            <TrendingUp size={22} />
          </div>
          <div>
            <span>Latest Rating</span>
            <h2>
              {reviews.length
                ? `${Number(reviews[0].overallRating || 0).toFixed(2)}/5`
                : "—"}
            </h2>
          </div>
        </div>
      </div>

      <section className="employee-performance-panel">
        <div className="employee-performance-panel-heading">
          <div>
            <h2>Performance History</h2>
            <p>Your published employee evaluations.</p>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="employee-performance-empty">
            <Award size={42} />
            <h3>No published reviews yet</h3>
            <p>
              Your performance reviews will appear here once your
              Admin or HR manager publishes them.
            </p>
          </div>
        ) : (
          <div className="employee-performance-review-list">
            {reviews.map(review => {
              const cycleName =
                review.cycleName ||
                review.performanceReviewCycle?.name ||
                "Performance Review";

              return (
                <article
                  className={`employee-performance-review ${
                    selectedReview?.id === review.id ? "selected" : ""
                  }`}
                  key={review.id}
                >
                  <div className="employee-performance-review-main">
                    <div className="employee-performance-review-icon">
                      <Award size={22} />
                    </div>

                    <div className="employee-performance-review-info">
                      <h3>{cycleName}</h3>
                      <span>
                        <CalendarDays size={14} />
                        Published: {formatDate(review.publishedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="employee-performance-review-rating">
                    {renderStars(review.overallRating)}
                    <strong>
                      {Number(review.overallRating || 0).toFixed(2)}/5
                    </strong>
                  </div>

                  <button
                    className="employee-performance-view-btn"
                    onClick={() =>
                      setSelectedReview(
                        selectedReview?.id === review.id ? null : review
                      )
                    }
                  >
                    {selectedReview?.id === review.id
                      ? "Hide Details"
                      : "View Details"}
                  </button>

                  {selectedReview?.id === review.id && (
                    <div className="employee-performance-details">
                      <h4>Rating Breakdown</h4>

                      <div className="employee-performance-rating-grid">
                        {ratingFields.map(([field, label]) => (
                          <div
                            className="employee-performance-rating-item"
                            key={field}
                          >
                            <span>{label}</span>
                            <div>
                              {renderStars(review[field])}
                              <strong>{review[field]}/5</strong>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="employee-performance-feedback-grid">
                        {[
                          ["Strengths", review.strengths],
                          ["Areas for Improvement", review.areasForImprovement],
                          ["Manager Comments", review.managerComments]
                        ].map(([heading, content]) => (
                          <div
                            className="employee-performance-feedback"
                            key={heading}
                          >
                            <h4>
                              <MessageSquare size={16} />
                              {heading}
                            </h4>
                            <p>{content || "No comments provided."}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default EmployeePerformance;
