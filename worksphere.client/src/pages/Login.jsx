import { useState } from "react";
import { Users, Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../App.css";

export default function Login({ onShowCareers }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Login failed. Check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="brand-icon">
            <Users size={25} />
          </div>
          <h2>Work<span>Sphere</span></h2>
        </div>

        <h1>Welcome back</h1>
        <p>Sign in to access your workspace.</p>

        {error && <div className="login-error">{error}</div>}

        <label>Email Address</label>
        <div className="login-input">
          <Mail size={18} />
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <label>Password</label>
        <div className="login-input">
          <Lock size={18} />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="login-submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
          {!loading && <ArrowRight size={17} />}
        </button>

        <span className="login-footer">
          WorkSphere Employee Management System
        </span>

        {onShowCareers && (
          <button
            type="button"
            className="career-back-login"
            onClick={onShowCareers}
          >
            <ArrowRight size={15} />
            Back to Careers
          </button>
        )}
      </form>
    </div>
  );
}