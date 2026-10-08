import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import API from "../utils/api";
import { safeApiCall } from "../utils/asyncHandler";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = () => (
  <svg className="i" viewBox="0 0 24 24">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const LeafSvg = () => (
  <svg className="leaf" viewBox="0 0 200 200" fill="currentColor" aria-hidden="true">
    <path d="M20 190C30 120 70 60 150 20c-5 70-40 130-130 170z"/>
    <path d="M60 190c5-50 30-90 80-120-2 50-25 95-80 120z" opacity=".6"/>
  </svg>
);

const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "digit", label: "One digit", test: (v) => /\d/.test(v) },
  { key: "special", label: "One special character", test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );
  const passedCount = ruleResults.filter((r) => r.passed).length;
  const allPassed = passedCount === PASSWORD_RULES.length;

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true); setError(""); setSuccess("");
      const [res, err] = await safeApiCall(API.post("/auth/google-login", { token: tokenResponse.access_token }));
      if (err) {
        setError(err.response?.data?.detail || "Google sign-up failed. Please try again.");
      } else if (res) {
        localStorage.setItem("token", res.data.access_token);
        const destination = res.data.is_profile_incomplete ? "/profile" : "/dashboard";
        setSuccess(res.data.is_new_user ? "Account created! Redirecting…" : "Google sign-in successful! Redirecting…");
        setTimeout(() => navigate(destination), 1500);
      }
      setGoogleLoading(false);
    },
    onError: () => { setGoogleLoading(false); setError("Google sign-in was cancelled or failed."); },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!age || isNaN(age) || age < 15 || age > 80) { setError("Please enter a valid age between 15 and 80"); return; }
    if (!role) { setError("Please select a role"); return; }
    if (!allPassed) { setError("Password does not meet all requirements"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    const [, err] = await safeApiCall(API.post("/auth/register", { username, email, age: parseInt(age, 10), role: role || "user", password }));
    if (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map((d) => {
          const field = d.loc?.[d.loc.length - 1] || "";
          const msg = d.msg?.replace(/^Value error, /, "") || d.msg;
          return field ? `${field}: ${msg}` : msg;
        });
        setError(messages.join(" • "));
      } else {
        setError(detail || "Registration failed. Try a different username/email.");
      }
    } else {
      setSuccess("Registration successful! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <div id="auth">
      {/* Left panel — form */}
      <section className="auth-panel" style={{ overflowY: "auto" }}>
        <div className="brand">
          <svg className="i" viewBox="0 0 24 24" style={{ width: 26, height: 26 }}>
            <ellipse cx="12" cy="5" rx="8" ry="3"/>
            <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>
          </svg>
          FullAIML
        </div>

        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="subtitle">Start building machine learning models from your data.</p>

          {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
          {success && <div className="alert-success" style={{ marginBottom: 12 }}>{success}</div>}

          <form className="form" onSubmit={handleSubmit} noValidate>
            {/* Name + Email row */}
            <div className="row2">
              <div className="field">
                <label htmlFor="s-username">Username</label>
                <div className="iw">
                  <input id="s-username" name="username" placeholder="johndoe" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="s-age">Age</label>
                <div className="iw">
                  <input id="s-age" name="age" type="number" placeholder="25" min="15" max="80" value={age} onChange={(e) => setAge(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="s-email">Email</label>
              <div className="iw">
                <input id="s-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="s-role">Role</label>
              <div className="iw">
                <select id="s-role" name="role" value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="">Select your role…</option>
                  <option value="Data Scientist">Data Scientist</option>
                  <option value="ML Engineer">ML Engineer</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="student">Student</option>
                  <option value="professional">Professional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="s-pw">Password</label>
              <div className="iw pw">
                <input id="s-pw" name="password" type={showPw ? "text" : "password"} placeholder="At least 8 characters" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="eye" aria-label={showPw ? "Hide" : "Show"} onClick={() => setShowPw((s) => !s)}><EyeIcon /></button>
              </div>
              {/* Strength indicator */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 2, background: "#E4E1D6", overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", borderRadius: 2, transition: "width .3s", width: `${(passedCount / PASSWORD_RULES.length) * 100}%`, background: passedCount <= 2 ? "var(--danger)" : passedCount <= 3 ? "var(--orange)" : "var(--primary)" }} />
                  </div>
                  <ul style={{ padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
                    {ruleResults.map((r) => (
                      <li key={r.key} style={{ fontSize: 11, color: r.passed ? "var(--primary)" : "var(--muted)", display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10 }}>{r.passed ? "✓" : "○"}</span> {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="s-cf">Confirm password</label>
              <div className="iw pw">
                <input id="s-cf" name="confirm" type={showCf ? "text" : "password"} placeholder="Re-enter your password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <button type="button" className="eye" aria-label={showCf ? "Hide" : "Show"} onClick={() => setShowCf((s) => !s)}><EyeIcon /></button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <span className="err">Passwords do not match</span>
              )}
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </form>

          {/* Google */}
          <div style={{ margin: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ color: "var(--muted)", fontSize: 12 }}>or</span>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => {
              if (import.meta.env.VITE_GOOGLE_CLIENT_ID?.includes("placeholder")) {
                setError("Google Sign-In requires a real VITE_GOOGLE_CLIENT_ID.");
                return;
              }
              googleLogin();
            }}
            disabled={googleLoading}
          >
            {googleLoading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <GoogleIcon />}
            {googleLoading ? "Connecting…" : "Sign up with Google"}
          </button>

          <p className="switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>

      {/* Right panel */}
      <aside className="auth-visual" aria-hidden="true">
        <LeafSvg />
        <div className="vcard">
          <svg className="i" viewBox="0 0 24 24" style={{ width: 64, height: 64, strokeWidth: 1.5, color: "var(--primary)" }}>
            <path d="M17.5 19a4.5 4.5 0 0 0 .5-9A6 6 0 0 0 6.3 9.5 4 4 0 0 0 7 19M12 12v8M9 15l3-3 3 3"/>
          </svg>
          <h2>Upload. Clean. Train.</h2>
          <p>Bring your CSV, XLSX, or JSON data and go from raw rows to a trained model.</p>
          <div className="chips">
            <span className="chip">CSV</span>
            <span className="chip">XLSX</span>
            <span className="chip">JSON</span>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Register;
