import { useEffect, useMemo, useState, useRef } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import {
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Settings2,
  BrainCircuit,
  Users,
  ShieldCheck,
  Sparkles,
  Upload,
  Search,
  Trash2,
  UserCheck,
  ChevronRight,
  TrendingUp,
  FileCode,
  ShieldAlert,
  Sparkle,
  RefreshCw,
  User,
  ArrowLeft,
  MailOpen,
  Key,
  Printer,
  FileDown,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  FileText,
  X,
} from "lucide-react";
import {
  cleanDataset,
  clearToken,
  getAdminSummary,
  getAnalysis,
  getToken,
  listDatasets,
  loginUser,
  preprocessDataset,
  registerUser,
  setToken,
  trainDataset,
  uploadDataset,
  downloadDataset,
  listUsers,
  updateUserRole,
  deleteUser,
  deleteDatasetAdmin,
  getCurrentUser,
  updateUserProfile,
  changePassword,
  deleteMe,
  getUserSummary,
  getDownloadHistory,
  deleteDownloadHistoryLog,
  requestOTP,
  verifyOTPLogin,
  verifyOTPReset,
  searchHubDatasets,
  importHubDataset,
  wakeUpBackend,
} from "./api";

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login, register, forgot, verify_login, verify_reset
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (form.password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (form.password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        const payload = await registerUser(form);
        setToken(payload.access_token);
        onAuth();
      } else if (mode === "login") {
        const payload = await loginUser({ email: form.email, password: form.password });
        setToken(payload.access_token);
        onAuth();
      } else if (mode === "verify_login") {
        const payload = await verifyOTPLogin(form.email, otp);
        setToken(payload.access_token);
        onAuth();
      } else if (mode === "verify_reset") {
        if (newPassword !== confirmNewPassword) {
          throw new Error("Passwords do not match");
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        const res = await verifyOTPReset(form.email, otp, newPassword);
        setSuccess(res.message || "Password reset successfully!");
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setMode("login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOTP(action) {
    setError("");
    setSuccess("");
    if (!form.email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await requestOTP(form.email, action);
      setSuccess(res.message || `OTP sent to ${form.email}`);
      setMode(action === "login" ? "verify_login" : "verify_reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel animate-fade-in">
        <div className="brand-header">
          <div className="brand-logo">
            <ShieldCheck size={28} />
          </div>
          <h2>Data Quality Hub</h2>
          <p>Enterprise Analytics & Cleaning Suite</p>
        </div>

        {success && (
          <div style={{
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "#10b981",
            padding: "12px",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <div className="form-group animate-slide-in">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div className="form-group">
              <label htmlFor="auth-email">Gmail Address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="name@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div className="form-group animate-slide-in">
              <label htmlFor="auth-password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="form-group animate-slide-in">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Verification Code Fields */}
          {(mode === "verify_login" || mode === "verify_reset") && (
            <div className="form-group animate-slide-in" style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", padding: "10px", background: "rgba(34, 211, 238, 0.05)", border: "1px solid rgba(34, 211, 238, 0.1)", borderRadius: "50%", marginBottom: "8px", alignSelf: "center", color: "#22d3ee" }}>
                <MailOpen size={20} />
              </div>
              <label htmlFor="auth-otp" style={{ display: "block", marginBottom: "4px" }}>Enter 6-Digit OTP</label>
              <input
                id="auth-otp"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{
                  textAlign: "center",
                  fontSize: "24px",
                  letterSpacing: "8px",
                  fontWeight: "bold",
                  padding: "10px 0",
                  fontFamily: "monospace"
                }}
                required
              />
              <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>
                Sent to <strong>{form.email}</strong>. Code expires in 5 minutes.
              </p>
            </div>
          )}

          {/* New Password fields for Reset */}
          {mode === "verify_reset" && (
            <>
              <div className="form-group animate-slide-in">
                <label htmlFor="reset-new-password">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group animate-slide-in">
                <label htmlFor="reset-confirm-password">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="reset-confirm-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    title={showConfirmNewPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && <p className="error-message"><ShieldAlert size={14} style={{ flexShrink: 0 }} /> {error}</p>}

          {/* Conditional Action Buttons */}
          {mode === "forgot" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }} className="animate-slide-in">
              <button
                type="button"
                disabled={loading}
                className="btn-primary"
                onClick={() => handleRequestOTP("login")}
                style={{ margin: 0, background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
              >
                {loading ? "Sending OTP..." : "Send OTP for Login"}
              </button>
              <button
                type="button"
                disabled={loading}
                className="btn-primary"
                onClick={() => handleRequestOTP("reset")}
                style={{ margin: 0, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)" }}
              >
                {loading ? "Sending OTP..." : "Send OTP to Reset Password"}
              </button>
            </div>
          ) : (
            <button type="submit" disabled={loading} className="btn-primary">
              {loading
                ? "Working..."
                : mode === "login"
                  ? "Sign In"
                  : mode === "register"
                    ? "Create Account"
                    : mode === "verify_login"
                      ? "Verify & Sign In"
                      : "Reset Password & Login"}
            </button>
          )}
        </form>

        {/* Back and Switch Options */}
        <div className="auth-footer" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
          {mode === "login" && (
            <button
              className="link-button"
              onClick={() => {
                setError("");
                setSuccess("");
                setMode("forgot");
              }}
              style={{ fontWeight: "600", color: "#38bdf8" }}
            >
              Forgot Password / Login with OTP
            </button>
          )}

          {(mode === "verify_login" || mode === "verify_reset") && (
            <button
              className="link-button"
              disabled={loading}
              onClick={() => handleRequestOTP(mode === "verify_login" ? "login" : "reset")}
              style={{ fontSize: "12px", color: "var(--text-secondary)" }}
            >
              <RefreshCw size={12} className={loading ? "spin" : ""} style={{ marginRight: "4px" }} />
              Resend OTP Code
            </button>
          )}

          <button
            className="link-button"
            onClick={() => {
              setError("");
              setSuccess("");
              setOtp("");
              setNewPassword("");
              setConfirmNewPassword("");
              setConfirmPassword("");
              setForm({ name: "", email: "", password: "" });
              if (mode === "login") {
                setMode("register");
              } else {
                setMode("login");
              }
            }}
            style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", margin: "4px auto 0 auto" }}
          >
            {mode !== "login" && mode !== "register" ? (
              <>
                <ArrowLeft size={14} /> Back to Sign In
              </>
            ) : mode === "login" ? (
              "Don't have an account? Sign up"
            ) : (
              "Already have an account? Sign in"
            )}
          </button>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, trend }) {
  return (
    <article className="metric-card">
      <div className="metric-icon-wrap">
        <Icon size={20} />
      </div>
      <div className="metric-details">
        <span>{label}</span>
        <strong>{value}</strong>
        {trend && <span className="metric-trend"><TrendingUp size={12} /> {trend}</span>}
      </div>
    </article>
  );
}

function FeatureImportanceChart({ importances }) {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  if (!importances || Object.keys(importances).length === 0) return null;
  
  const chartData = Object.entries(importances).map(([name, val]) => ({
    name: name.length > 15 ? name.substring(0, 15) + "..." : name,
    importance: val,
  })).sort((a, b) => b.importance - a.importance);

  const chart = (
    <BarChart
      data={chartData}
      layout="vertical"
      margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
      width={isPrinting ? 330 : undefined}
      height={isPrinting ? 200 : undefined}
    >
      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
      <XAxis type="number" domain={[0, 1]} />
      <YAxis dataKey="name" type="category" width={110} tick={{ fill: "#64748b", fontSize: 11 }} />
      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc" }} />
      <Bar dataKey="importance" fill="#14b8a6" radius={[0, 4, 4, 0]}>
        {chartData.map((entry, index) => (
          <Cell key={entry.name} fill={index === 0 ? "#14b8a6" : index === 1 ? "#2563eb" : "#3b82f6"} />
        ))}
        <LabelList dataKey="importance" position="right" style={{ fill: isPrinting ? "#0f172a" : "#cbd5e1", fontSize: 10, fontWeight: "bold" }} formatter={(v) => Number(v).toFixed(3)} />
      </Bar>
    </BarChart>
  );

  return (
    <div className="importance-chart-box">
      <h3>Top Feature Importance</h3>
      <div className="chart-box">
        {isPrinting ? chart : <ResponsiveContainer width="100%" height={200}>{chart}</ResponsiveContainer>}
      </div>
    </div>
  );
}

function ConfusionMatrix({ data }) {
  if (!data || !data.matrix) return null;
  const { classes, matrix } = data;
  return (
    <div className="cm-container">
      <h3>Confusion Matrix</h3>
      <div className="cm-table-wrapper">
        <table className="cm-table">
          <thead>
            <tr>
              <th>True \ Pred</th>
              {classes.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <th>{classes[i]}</th>
                {row.map((val, j) => (
                  <td key={j} className={i === j ? "cm-diagonal" : ""}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserDashboard({ summary, onOpenDataset, onNavigateToLibrary, userProfile }) {
  if (!summary) {
    return (
      <div className="card empty-state text-center">
        <LayoutDashboard size={48} className="animate-spin text-primary" />
        <h2>Loading Your Dashboard</h2>
        <p>Calculating dataset metrics and loading active tasks...</p>
      </div>
    );
  }

  const { total_uploads, total_downloads, average_quality_score, recent_activity, my_datasets } = summary;

  return (
    <div className="user-dashboard animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div className="card" style={{
        background: "radial-gradient(circle at top left, rgba(20, 184, 166, 0.08), transparent 45%), var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: "32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "24px"
      }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>
            Welcome back, {userProfile?.name || "Explorer"}!
          </h2>
          <p className="muted" style={{ fontSize: "14px", maxWidth: "600px", lineHeight: "1.6" }}>
            Monitor your uploaded datasets, track pipeline metrics, review processing logs, and explore dataset quality parameters.
          </p>
        </div>
        <button className="btn-primary" onClick={onNavigateToLibrary} style={{ margin: 0, padding: "12px 24px" }}>
          Upload New CSV Dataset
        </button>
      </div>

      <div className="metrics-grid">
        <Metric icon={Database} label="Total Uploaded Datasets" value={total_uploads} />
        <Metric icon={Download} label="Total Downloads" value={total_downloads} />
        <Metric icon={Sparkles} label="Average Dataset Quality" value={`${average_quality_score}%`} />
      </div>

      <div className="two-column">
        <div className="card">
          <h2>Your Personal Datasets ({my_datasets.length})</h2>
          <p className="muted text-sm mb-4">Quickly access and switch to the processing workspace for any of your uploaded files.</p>
          {my_datasets.length === 0 ? (
            <div className="text-center py-4">
              <p className="muted text-sm">You have not uploaded any datasets yet.</p>
              <button className="link-button mt-4" onClick={onNavigateToLibrary}>
                Upload your first dataset
              </button>
            </div>
          ) : (
            <div className="table-wrap" style={{ maxHeight: "340px", overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Quality</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {my_datasets.map((ds) => (
                    <tr key={ds.id}>
                      <td style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <strong>{ds.filename}</strong>
                      </td>
                      <td>
                        <span className={ds.quality_score >= 80 ? "text-success font-bold" : ds.quality_score >= 50 ? "text-warning font-bold" : "text-danger font-bold"}>
                          {ds.quality_score}%
                        </span>
                      </td>
                      <td>
                        <span className={`status badge-${ds.status}`}>{ds.status}</span>
                      </td>
                      <td>
                        <button className="btn-open" onClick={() => onOpenDataset(ds.id)} style={{ padding: 0 }}>
                          Pipeline Workspace →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Your Recent Activities</h2>
          <p className="muted text-sm mb-4">Historical log of cleaning, preprocessing, model training, and export actions.</p>
          {recent_activity.length === 0 ? (
            <p className="muted text-sm text-center py-4">No activities logged yet. Get started by uploading or cleaning a dataset!</p>
          ) : (
            <div className="timeline-container" style={{ maxHeight: "340px", overflowY: "auto", paddingRight: "8px" }}>
              {recent_activity.map((log) => {
                let ActionIcon = Sparkles;
                if (log.action === "upload") ActionIcon = Upload;
                else if (log.action === "preprocessing") ActionIcon = Settings2;
                else if (log.action === "training") ActionIcon = BrainCircuit;
                else if (log.action === "export") ActionIcon = Download;

                return (
                  <div key={log.id} className="timeline-item" style={{ display: "flex", gap: "16px" }}>
                    <div className="timeline-badge-wrap">
                      <div className={`timeline-icon-badge ${log.action}`} style={{ width: "24px", height: "24px" }}>
                        <ActionIcon size={12} />
                      </div>
                      <div className="timeline-line"></div>
                    </div>
                    <div className="timeline-content" style={{ padding: "12px", marginBottom: "16px" }}>
                      <div className="timeline-header" style={{ marginBottom: "4px" }}>
                        <strong className="timeline-action" style={{ fontSize: "12px" }}>
                          {log.action === "upload" && "Dataset Uploaded"}
                          {log.action === "cleaning" && "Data Cleaned"}
                          {log.action === "preprocessing" && "Features Preprocessed"}
                          {log.action === "training" && "Predictive Model Trained"}
                          {log.action === "export" && "Dataset Exported"}
                        </strong>
                        <span className="timeline-time" style={{ fontSize: "10px" }}>
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="timeline-details" style={{ fontSize: "12px", margin: 0 }}>{log.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserDownloadsView({ downloads, onOpenDataset, onDownload, onDeleteHistory, loading, userProfile }) {
  if (loading && downloads.length === 0) {
    return (
      <div className="card empty-state text-center">
        <RefreshCw size={40} className="animate-spin text-primary" />
        <p>Loading downloads history...</p>
      </div>
    );
  }

  const isAdmin = userProfile?.role === "admin";

  return (
    <div className="downloads-view animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="card">
        <h2>{isAdmin ? "Global Downloads History" : "My Downloads History"}</h2>
        <p className="muted text-sm mb-4">
          {isAdmin 
            ? "Historical audit log of all datasets exported across the system by all users. Re-download any version instantly."
            : "Historical audit log of all datasets you have exported from the platform. Re-download any version instantly."}
        </p>
        
        {downloads.length === 0 ? (
          <div className="empty-state text-center" style={{ padding: "40px 20px" }}>
            <Download size={40} className="text-muted" style={{ marginBottom: "12px" }} />
            <h3>No Download History</h3>
            <p className="muted text-sm">Your download activity log is empty. Exported files will be tracked here automatically.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  {isAdmin && <th>Downloaded By</th>}
                  <th>Downloaded Date</th>
                  <th>Version Quality</th>
                  <th>Status</th>
                  <th>Export Format Re-downloads</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((item) => (
                  <tr key={item.log_id}>
                    <td>
                      <button 
                        className="btn-open" 
                        onClick={() => onOpenDataset(item.dataset_id)}
                        style={{ fontWeight: "700", textAlign: "left", padding: 0 }}
                      >
                        {item.filename}
                      </button>
                    </td>
                    {isAdmin && (
                      <td>
                        <strong>{item.downloaded_by || "Unknown"}</strong>
                      </td>
                    )}
                    <td>{new Date(item.downloaded_at).toLocaleString()}</td>
                    <td>
                      <span className={item.quality_score >= 80 ? "text-success font-bold" : item.quality_score >= 50 ? "text-warning font-bold" : "text-danger font-bold"}>
                        {item.quality_score}%
                      </span>
                    </td>
                    <td>
                      <span className={`status badge-${item.status}`}>{item.status}</span>
                    </td>
                    <td>
                      <div className="download-stage-group" style={{ margin: 0, justifyContent: "flex-start", gap: "8px" }}>
                        <div className="download-stage-row">
                          <span className="stage-label" style={{ fontSize: "10px" }}>Raw:</span>
                          <button className="btn-icon-link" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => onDownload({ id: item.dataset_id, filename: item.filename }, "csv", "raw")}>CSV</button>
                          <button className="btn-icon-link" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => onDownload({ id: item.dataset_id, filename: item.filename }, "excel", "raw")}>Excel</button>
                        </div>
                        <div className="download-stage-row">
                          <span className="stage-label" style={{ fontSize: "10px" }}>Proc:</span>
                          {item.status === "analyzed" ? (
                            <span className="stage-pending-text" style={{ fontSize: "10px" }} title="Run cleaning/preprocessing first">Pending</span>
                          ) : (
                            <>
                              <button className="btn-icon-link text-success" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => onDownload({ id: item.dataset_id, filename: item.filename }, "csv", "processed")}>CSV</button>
                              <button className="btn-icon-link text-success" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => onDownload({ id: item.dataset_id, filename: item.filename }, "excel", "processed")}>Excel</button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn-icon-danger"
                        onClick={() => onDeleteHistory && onDeleteHistory(item.log_id)}
                        title="Delete from history"
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
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

function AdminDashboard({ summary, error, onReload, userProfile }) {
  const [users, setUsers] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [subView, setSubView] = useState("overview");
  const [filterQuery, setFilterQuery] = useState("");

  async function fetchUsersList() {
    setLoadingUsers(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchDatasetsList() {
    setLoadingDatasets(true);
    try {
      const data = await listDatasets();
      setDatasets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDatasets(false);
    }
  }

  useEffect(() => {
    if (summary) {
      fetchUsersList();
      fetchDatasetsList();
    }
  }, [summary]);

  const filteredActivities = useMemo(() => {
    if (!summary?.recent_activities) return [];
    return summary.recent_activities.filter((act) => {
      const q = filterQuery.toLowerCase();
      return (
        (act.user_name || "").toLowerCase().includes(q) ||
        (act.action || "").toLowerCase().includes(q) ||
        (act.dataset_filename || "").toLowerCase().includes(q) ||
        (act.details || "").toLowerCase().includes(q)
      );
    });
  }, [summary?.recent_activities, filterQuery]);

  async function handleToggleRole(userId, currentRole) {
    setActionMessage("");
    const targetRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateUserRole(userId, targetRole);
      setActionMessage("User role updated successfully.");
      await fetchUsersList();
      if (onReload) onReload();
    } catch (err) {
      setActionMessage(err.message);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Are you sure you want to delete this user? All their datasets will be removed from disk and database.")) return;
    setActionMessage("");
    try {
      await deleteUser(userId);
      setActionMessage("User and associated datasets deleted successfully.");
      await fetchUsersList();
      await fetchDatasetsList();
      if (onReload) onReload();
    } catch (err) {
      setActionMessage(err.message);
    }
  }

  async function handleDeleteDataset(datasetId) {
    if (!window.confirm("Are you sure you want to delete this dataset?")) return;
    setActionMessage("");
    try {
      await deleteDatasetAdmin(datasetId);
      setActionMessage("Dataset deleted successfully.");
      await fetchDatasetsList();
      if (onReload) onReload();
    } catch (err) {
      setActionMessage(err.message);
    }
  }

  if (error) {
    return (
      <section className="card empty-state text-center">
        <ShieldAlert size={48} className="text-danger animate-pulse" />
        <h2>Access Denied</h2>
        <p>You require administrator privileges to access this area.</p>
        <p className="muted small">{error}</p>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="card empty-state text-center">
        <LayoutDashboard size={48} className="animate-spin text-primary" />
        <h2>Loading Platform Analytics</h2>
        <p>Fetching database metrics and active sessions...</p>
      </section>
    );
  }

  return (
    <section className="dashboard animate-fade-in">
      <div className="admin-tabs">
        <button className={subView === "overview" ? "active" : ""} onClick={() => setSubView("overview")}>Overview</button>
        <button className={subView === "activity" ? "active" : ""} onClick={() => setSubView("activity")}>Activity Monitor</button>
        <button className={subView === "users" ? "active" : ""} onClick={() => setSubView("users")}>Manage Users ({users.length})</button>
        <button className={subView === "datasets" ? "active" : ""} onClick={() => setSubView("datasets")}>Manage Datasets ({datasets.length})</button>
      </div>

      {actionMessage && <p className="action-alert">{actionMessage}</p>}

      {subView === "overview" && (
        <>
          <div className="metrics-grid">
            <Metric icon={Users} label="Total Users" value={summary.total_users} />
            <Metric icon={Database} label="System Datasets" value={summary.total_datasets} />
            <Metric icon={Sparkles} label="Avg Quality Score" value={`${summary.average_quality_score}%`} />
            <Metric icon={CheckCircle2} label="Cleaned Datasets" value={summary.cleaned_datasets} />
            <Metric icon={Settings2} label="Preprocessed" value={summary.preprocessed_datasets} />
            <Metric icon={BrainCircuit} label="Trained Models" value={summary.trained_datasets} />
            <Metric icon={FileSpreadsheet} label="Total Records" value={summary.total_rows.toLocaleString()} />
            <Metric icon={Database} label="Total Attributes" value={summary.total_columns} />
          </div>

          <div className="card mt-6">
            <h2>Pipeline Status Distributions</h2>
            <div className="status-grid">
              {Object.entries(summary.status_counts).map(([status, count]) => (
                <div key={status} className="status-item">
                  <strong>{status}</strong>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="two-column mt-6">
            <div className="card">
              <h2>Recent Registrations</h2>
              <div className="user-log-list">
                {summary.recent_users.map((user) => (
                  <div key={user.id} className="log-row">
                    <div>
                      <strong>{user.name}</strong>
                      <span className="muted block text-xs">{user.email}</span>
                    </div>
                    <span className={`badge ${user.role === "admin" ? "badge-admin" : "badge-user"}`}>{user.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>Low-Quality Datasets (&lt;60%)</h2>
              <div className="low-quality-list">
                {summary.low_quality_datasets.length === 0 ? (
                  <p className="success text-sm">All system datasets satisfy high-quality criteria.</p>
                ) : (
                  summary.low_quality_datasets.map((ds) => (
                    <div key={ds.id} className="log-row">
                      <div>
                        <strong>{ds.filename}</strong>
                        <span className="muted block text-xs">{ds.rows_count} rows × {ds.columns_count} columns</span>
                      </div>
                      <span className="text-danger font-bold">{ds.quality_score}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {subView === "activity" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2>System-Wide Activity Monitor</h2>
              <p className="muted text-sm">Real-time audit log of all uploads, edits, cleanings, pre-processings, model training, and dataset exports.</p>
            </div>
            <div className="search-box" style={{ maxWidth: "300px", width: "100%", margin: 0, position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Filter activities..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{ paddingLeft: "36px", fontSize: "13px", width: "100%", height: "38px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-main)" }}
              />
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-6">
              <p className="muted text-sm">No activity logs match your filter criteria.</p>
            </div>
          ) : (
            <div className="timeline-container" style={{ paddingRight: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredActivities.map((log) => {
                let ActionIcon = Sparkles;
                let actionLabel = log.action;
                if (log.action === "upload") {
                  ActionIcon = Upload;
                  actionLabel = "Dataset Uploaded";
                } else if (log.action === "cleaning") {
                  ActionIcon = Sparkles;
                  actionLabel = "Data Cleaned";
                } else if (log.action === "preprocessing") {
                  ActionIcon = Settings2;
                  actionLabel = "Features Preprocessed";
                } else if (log.action === "training") {
                  ActionIcon = BrainCircuit;
                  actionLabel = "Model Trained";
                } else if (log.action === "export") {
                  ActionIcon = Download;
                  actionLabel = "Dataset Exported";
                }

                return (
                  <div key={log.id} style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div className={`timeline-icon-badge ${log.action}`} style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ActionIcon size={14} />
                      </div>
                      <div style={{ width: "2px", flexGrow: 1, backgroundColor: "var(--border-color)", margin: "4px 0" }}></div>
                    </div>
                    <div style={{ padding: "16px", marginBottom: "8px", flexGrow: 1, border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>{log.user_name}</strong>
                          <span className="muted" style={{ fontSize: "11px", marginLeft: "8px" }}>({log.user_id === userProfile?.id ? "You" : `User ID: ${log.user_id}`})</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                            <span className={`status badge-${log.action}`} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>{actionLabel}</span>
                            <span className="muted" style={{ fontSize: "11px" }}>on <strong>{log.dataset_filename || "Deleted Dataset"}</strong></span>
                          </div>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", margin: 0, color: "var(--text-secondary)", lineHeight: "1.5" }}>{log.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subView === "users" && (
        <div className="card">
          <h2>Platform Users</h2>
          {loadingUsers ? (
            <p className="text-center py-4">Fetching users...</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "badge-admin" : "badge-user"}`}>{u.role}</span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="admin-actions-cell">
                        <button className="btn-sm btn-secondary" onClick={() => handleToggleRole(u.id, u.role)}>
                          <UserCheck size={14} /> Toggle Role
                        </button>
                        <button className="btn-sm btn-danger ml-2" onClick={() => handleDeleteUser(u.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subView === "datasets" && (
        <div className="card">
          <h2>All Uploaded Datasets</h2>
          {loadingDatasets ? (
            <p className="text-center py-4">Fetching datasets...</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Owner</th>
                    <th>Quality</th>
                    <th>Status</th>
                    <th>Rows/Cols</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds) => (
                    <tr key={ds.id}>
                      <td><strong>{ds.filename}</strong></td>
                      <td>{ds.owner_name || "Unknown"}</td>
                      <td><span className={ds.quality_score >= 80 ? "text-success font-bold" : ds.quality_score >= 50 ? "text-warning font-bold" : "text-danger font-bold"}>{ds.quality_score}%</span></td>
                      <td><span className={`status badge-${ds.status}`}>{ds.status}</span></td>
                      <td>{ds.rows_count} / {ds.columns_count}</td>
                      <td>
                        <button className="btn-sm btn-danger" onClick={() => handleDeleteDataset(ds.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DatasetLibrary({
  datasets,
  search,
  setSearch,
  onOpen,
  onDownload,
  loading,
  handleUpload,
  uploadLoading,
  onImport,
}) {
  const [activeIngestTab, setActiveIngestTab] = useState("upload"); // upload, discover
  const [hubQuery, setHubQuery] = useState("");
  const [hubResults, setHubResults] = useState([]);
  const [hubLoading, setHubLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [hubError, setHubError] = useState("");

  const getSourceBadgeStyle = (source) => {
    if (source === "kaggle") {
      return { text: "Kaggle", bg: "rgba(6, 182, 212, 0.15)", fg: "var(--color-cyan)" };
    } else if (source === "huggingface") {
      return { text: "Hugging Face", bg: "rgba(234, 179, 8, 0.15)", fg: "var(--color-warning)" };
    } else if (source === "datagov") {
      return { text: "Data.gov", bg: "rgba(239, 68, 68, 0.15)", fg: "var(--color-danger)" };
    } else if (source === "datahub") {
      return { text: "Datahub.io", bg: "rgba(16, 185, 129, 0.15)", fg: "var(--color-success)" };
    } else {
      return { text: "Upload", bg: "rgba(139, 92, 246, 0.15)", fg: "var(--color-secondary)" };
    }
  };

  // Auto-search as the user types (with a minimum of 3 characters)
  useEffect(() => {
    if (activeIngestTab === "discover") {
      const queryTrimmed = hubQuery.trim();
      if (queryTrimmed.length >= 3) {
        const delayDebounceFn = setTimeout(() => {
          handleHubSearch();
        }, 500); // 500ms debounce to prevent excessive API calls
        return () => clearTimeout(delayDebounceFn);
      } else if (queryTrimmed.length === 0) {
        // Clear results or load popular templates when query is empty
        setHubLoading(true);
        setHubError("");
        searchHubDatasets("")
          .then((res) => setHubResults(res))
          .catch((err) => setHubError(err.message))
          .finally(() => setHubLoading(false));
      }
    }
  }, [hubQuery, activeIngestTab]);

  const handleHubSearch = async () => {
    setHubLoading(true);
    setHubError("");
    try {
      const res = await searchHubDatasets(hubQuery);
      setHubResults(res);
    } catch (err) {
      setHubError(err.message || "Failed to search external hubs.");
    } finally {
      setHubLoading(false);
    }
  };

  const handleHubImport = async (result) => {
    setImportingId(result.id);
    setHubError("");
    try {
      await onImport(result);
    } catch (err) {
      setHubError(err.message || "Failed to import dataset.");
    } finally {
      setImportingId(null);
    }
  };

  return (
    <section className="library-layout animate-fade-in">
      <div className="hero-upload-container" style={{ paddingBottom: "24px" }}>
        <div className="hero-banner">
          <h2>Ingest & Analyze New Dataset</h2>
          <p>Upload your own CSV file or search and import datasets directly from external hubs like Kaggle and Hugging Face to start the pipeline.</p>
        </div>

        {/* Tab Selection */}
        <div className="ingest-tabs" style={{ display: "flex", gap: "24px", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", width: "100%" }}>
          <button 
            className={`btn-tab ${activeIngestTab === "upload" ? "active" : ""}`} 
            onClick={() => setActiveIngestTab("upload")}
            style={{ 
              background: "none", 
              border: "none", 
              color: activeIngestTab === "upload" ? "var(--color-primary)" : "var(--text-muted)", 
              borderBottom: activeIngestTab === "upload" ? "2px solid var(--color-primary)" : "2px solid transparent", 
              padding: "8px 4px",
              fontWeight: "600", 
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Upload Local CSV
          </button>
          <button 
            className={`btn-tab ${activeIngestTab === "discover" ? "active" : ""}`} 
            onClick={() => setActiveIngestTab("discover")}
            style={{ 
              background: "none", 
              border: "none", 
              color: activeIngestTab === "discover" ? "var(--color-primary)" : "var(--text-muted)", 
              borderBottom: activeIngestTab === "discover" ? "2px solid var(--color-primary)" : "2px solid transparent", 
              padding: "8px 4px",
              fontWeight: "600", 
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Discover Datasets (Kaggle / Hugging Face)
          </button>
        </div>

        {activeIngestTab === "upload" ? (
          <label className="central-upload-box">
            <Upload size={32} />
            <h3>{uploadLoading ? "Uploading & Analyzing..." : "Upload CSV Dataset"}</h3>
            <p>Click to browse files or drag and drop a CSV here</p>
            <input type="file" accept=".csv" onChange={handleUpload} disabled={uploadLoading} />
          </label>
        ) : (
          <div style={{ width: "100%" }}>
            {/* Hub Search Box */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search Kaggle & Hugging Face Hub (e.g. titanic, diabetes, iris)..."
                  value={hubQuery}
                  onChange={(e) => setHubQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleHubSearch()}
                  style={{ 
                    width: "100%", 
                    padding: "12px 14px 12px 42px", 
                    borderRadius: "var(--radius-sm)", 
                    border: "1px solid var(--border-color)", 
                    backgroundColor: "var(--bg-secondary)", 
                    color: "var(--text-primary)",
                    fontSize: "14px"
                  }}
                />
              </div>
              <button 
                className="btn-open" 
                onClick={handleHubSearch} 
                disabled={hubLoading}
                style={{ padding: "0 24px", height: "46px" }}
              >
                {hubLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Hub Error Display */}
            {hubError && (
              <div style={{ color: "var(--color-danger)", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px", marginBottom: "16px" }}>
                {hubError}
              </div>
            )}

            {/* Results Grid */}
            {hubLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "12px" }}>
                <RefreshCw size={32} className="animate-spin text-primary" />
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Searching external dataset repositories...</p>
              </div>
            ) : hubResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                <Database size={32} style={{ marginBottom: "10px", opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No datasets found matching your search. Try another query.</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "12px", letterSpacing: "0.5px" }}>
                  {!hubQuery ? "Recommended Quick-Start Datasets" : `Found ${hubResults.length} Matching Datasets`}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {hubResults.map((result) => (
                    <article 
                      key={result.id} 
                      style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        justifyContent: "space-between", 
                        padding: "16px", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "var(--radius-sm)", 
                        backgroundColor: "var(--bg-secondary)",
                        transition: "transform 0.2s, box-shadow 0.2s"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span 
                            style={{ 
                              fontSize: "10px", 
                              padding: "3px 8px", 
                              borderRadius: "4px", 
                              fontWeight: "bold", 
                              textTransform: "uppercase",
                              backgroundColor: getSourceBadgeStyle(result.source).bg,
                              color: getSourceBadgeStyle(result.source).fg
                            }}
                          >
                            {getSourceBadgeStyle(result.source).text}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{result.size}</span>
                        </div>
                        <h4 style={{ margin: "0 0 6px 0", color: "var(--text-primary)", fontSize: "14px", fontWeight: "600", lineBreak: "anywhere" }} title={result.name}>
                          {result.name}
                        </h4>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 16px 0", lineHeight: "1.4", height: "60px", overflow: "hidden", textOverflow: "ellipsis" }} title={result.description}>
                          {result.description}
                        </p>
                      </div>
                      <button 
                        className="btn-open" 
                        onClick={() => handleHubImport(result)}
                        disabled={importingId !== null}
                        style={{ width: "100%", justifyContent: "center", height: "36px", padding: 0 }}
                      >
                        {importingId === result.id ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" style={{ marginRight: "8px" }} /> Ingesting...
                          </>
                        ) : (
                          "Import to Catalog"
                        )}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="library-content-divider">
        <div className="library-section-header">
          <h2>Available Datasets Catalog</h2>
          <p>Select any dataset to open its interactive data quality pipeline or download in different formats.</p>
        </div>
        <div className="search-wrap">
          <Search size={18} />
          <input
            className="search-input"
            placeholder="Search datasets by name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card empty-state text-center">
          <RefreshCw size={40} className="animate-spin text-primary" />
          <p>Syncing library...</p>
        </div>
      ) : datasets.length === 0 ? (
        <div className="card empty-state text-center">
          <Database size={46} className="text-muted" />
          <h2>No Datasets Available</h2>
          <p>Be the first to upload a dataset or adjust your search filter above.</p>
        </div>
      ) : (
        <div className="dataset-grid">
          {datasets.map((dataset) => (
            <article className="dataset-card" key={dataset.id}>
              <div className="dataset-card-header">
                <FileSpreadsheet size={24} />
                <span className={`badge-status status-${dataset.status}`}>
                  {dataset.status}
                </span>
              </div>
              <h3 title={dataset.filename}>{dataset.filename}</h3>
              <div className="dataset-metadata">
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span className="owner-badge">Uploader: {dataset.owner_name || "System"}</span>
                  <span 
                    className={`badge-source source-${dataset.source || 'upload'}`} 
                    style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      backgroundColor: getSourceBadgeStyle(dataset.source).bg,
                      color: getSourceBadgeStyle(dataset.source).fg
                    }}
                  >
                    {getSourceBadgeStyle(dataset.source).text}
                  </span>
                </div>
                <p>{dataset.rows_count.toLocaleString()} rows × {dataset.columns_count} columns</p>
              </div>
              <div className="quality-progress-bar">
                <div className="bar-labels">
                  <span>Quality Score</span>
                  <strong>{dataset.quality_score}%</strong>
                </div>
                <div className="progress-track">
                  <span
                    className={dataset.quality_score >= 80 ? "bg-success" : dataset.quality_score >= 50 ? "bg-warning" : "bg-danger"}
                    style={{ width: `${Math.min(dataset.quality_score, 100)}%` }}
                  />
                </div>
              </div>
              <div className="dataset-actions-footer">
                <button className="btn-open" onClick={() => onOpen(dataset.id)}>
                  Analyze & Pipeline <ChevronRight size={14} />
                </button>
                <div className="download-stage-group">
                  <div className="download-stage-row">
                    <span className="stage-label">Raw:</span>
                    <button className="btn-icon-link" title="Download Raw CSV" onClick={() => onDownload(dataset, "csv", "raw")}>CSV</button>
                    <button className="btn-icon-link" title="Download Raw Excel" onClick={() => onDownload(dataset, "excel", "raw")}>Excel</button>
                  </div>
                  <div className="download-stage-row">
                    <span className="stage-label">Processed:</span>
                    {dataset.status === "analyzed" ? (
                      <span className="stage-pending-text" title="Run cleaning or preprocessing first to download transformed data">Pending...</span>
                    ) : (
                      <>
                        <button className="btn-icon-link text-success" title="Download Processed CSV" onClick={() => onDownload(dataset, "csv", "processed")}>CSV</button>
                        <button className="btn-icon-link text-success" title="Download Processed Excel" onClick={() => onDownload(dataset, "excel", "processed")}>Excel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ReportList({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="report-block">
      <h3>{title}</h3>
      <ul className="report-ul">
        {items.map((item, index) => (
          <li key={index} className="report-li">
            {typeof item === "string" ? (
              item
            ) : (
              <span>
                <strong>{item.column}</strong>: {item.capped_values} outliers treated.
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrainingReport({ report }) {
  if (!report) return null;
  if (report.error) {
    return <p className="error-message"><ShieldAlert size={14} /> {report.error}</p>;
  }

  const isReg = report.task_type === "regression";

  return (
    <div className="training-report animate-fade-in">
      <div className="metrics-grid small-grid">
        <Metric icon={BrainCircuit} label="Resolved Model" value={report.model_type} />
        <Metric icon={FileSpreadsheet} label="Target Attribute" value={report.target_column} />
        <Metric icon={Database} label="Features Trained" value={report.feature_count} />
        <Metric icon={CheckCircle2} label="Validation Records" value={report.test_rows} />
      </div>

      <div className="card-sub-grid">
        <div className="sub-panel">
          <h3>Model Performance Metrics</h3>
          <div className="performance-metrics">
            {Object.entries(report.metrics || {}).map(([name, value]) => (
              <div key={name} className="metric-row">
                <span className="capitalize">{name.replaceAll("_", " ")}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
        </div>

        {report.feature_importances && Object.keys(report.feature_importances).length > 0 && (
          <div className="sub-panel">
            <FeatureImportanceChart importances={report.feature_importances} />
          </div>
        )}
      </div>

      {report.confusion_matrix && (
        <div className="card mt-4">
          <ConfusionMatrix data={report.confusion_matrix} />
        </div>
      )}

      <div className="card mt-4">
        <h3>Sample Predictions (Test Set)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Row #</th>
                <th>Actual Value</th>
                <th>Predicted Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.sample_predictions?.map((pred, index) => {
                const actualValStr = String(pred.actual);
                const predValStr = String(pred.predicted);
                const matches = actualValStr === predValStr;
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td><span className="font-bold">{actualValStr}</span></td>
                    <td><span className="text-primary font-bold">{predValStr}</span></td>
                    <td>
                      {!isReg ? (
                        <span className={`badge ${matches ? "badge-success" : "badge-danger"}`}>
                          {matches ? "Correct" : "Incorrect"}
                        </span>
                      ) : (
                        <span className="text-xs muted">
                          Diff: {(Math.abs(parseFloat(actualValStr) - parseFloat(predValStr))).toFixed(4)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  analysisResult,
  onClean,
  onPreprocess,
  onTrain,
  onDownload,
  datasets = [],
  onSwitchDataset,
  onBackToLibrary,
}) {
  const analysis = analysisResult?.analysis;
  const dataset = analysisResult?.dataset;
  const lineageLogs = analysisResult?.lineage_logs || [];

  const [imputation, setImputation] = useState("median");
  const [outliers, setOutliers] = useState("iqr");
  const [scaling, setScaling] = useState("standard");
  const [targetColumn, setTargetColumn] = useState("");
  const [algo, setAlgo] = useState("auto");
  const [pipelineTab, setPipelineTab] = useState("clean");

  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (analysis?.column_names && analysis.column_names.length > 0) {
      setTargetColumn("Total Dataset");
    } else {
      setTargetColumn("");
    }
  }, [analysis]);

  const handleDownloadPDF = () => {
    const element = document.getElementById("pdf-report-content");
    if (!element) return;
    
    const cloned = element.cloneNode(true);
    cloned.style.position = "static";
    cloned.style.left = "auto";
    cloned.style.top = "auto";
    cloned.style.display = "block";
    cloned.style.width = "780px";
    cloned.style.background = "#ffffff";
    cloned.style.color = "#0b0f19";
    cloned.style.padding = "20px";
    
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.appendChild(cloned);
    document.body.appendChild(container);
    
    const opt = {
      margin:       [8, 8, 8, 8],
      filename:     `report_${dataset.filename.replace(/\.[^/.]+$/, "")}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    window.html2pdf().set(opt).from(cloned).save().then(() => {
      document.body.removeChild(container);
    }).catch(err => {
      console.error("PDF generation failed:", err);
      document.body.removeChild(container);
    });
  };

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const missingChart = useMemo(() => {
    if (!analysis?.missing_by_column) return [];
    return Object.entries(analysis.missing_by_column).map(([name, missing]) => ({
      name: name.length > 10 ? name.substring(0, 10) + "..." : name,
      missing,
    }));
  }, [analysis]);

  const completenessData = useMemo(() => {
    if (!analysis?.missing_by_column || !analysis?.rows_count) return [];
    return Object.entries(analysis.missing_by_column).map(([name, missing]) => {
      const completePct = ((analysis.rows_count - missing) / analysis.rows_count) * 100;
      return {
        name: name.length > 10 ? name.substring(0, 10) + "..." : name,
        completeness: Math.round(completePct),
      };
    });
  }, [analysis]);

  const beforeAnalysis = useMemo(() => analysis?.original_analysis || analysis, [analysis]);
  const afterAnalysis = analysis;

  const beforeDataTypeCounts = useMemo(() => {
    if (!beforeAnalysis?.data_types) return [];
    const counts = { Numeric: 0, Categorical: 0, Boolean: 0, Other: 0 };
    Object.values(beforeAnalysis.data_types).forEach((type) => {
      const t = String(type).toLowerCase();
      if (t.includes("int") || t.includes("float") || t.includes("number") || t.includes("double")) {
        counts.Numeric++;
      } else if (t.includes("bool")) {
        counts.Boolean++;
      } else if (t.includes("object") || t.includes("str") || t.includes("char") || t.includes("category")) {
        counts.Categorical++;
      } else {
        counts.Other++;
      }
    });
    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, count]) => ({ name, count }));
  }, [beforeAnalysis]);

  const afterDataTypeCounts = useMemo(() => {
    if (!afterAnalysis?.data_types) return [];
    const counts = { Numeric: 0, Categorical: 0, Boolean: 0, Other: 0 };
    Object.values(afterAnalysis.data_types).forEach((type) => {
      const t = String(type).toLowerCase();
      if (t.includes("int") || t.includes("float") || t.includes("number") || t.includes("double")) {
        counts.Numeric++;
      } else if (t.includes("bool")) {
        counts.Boolean++;
      } else if (t.includes("object") || t.includes("str") || t.includes("char") || t.includes("category")) {
        counts.Categorical++;
      } else {
        counts.Other++;
      }
    });
    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, count]) => ({ name, count }));
  }, [afterAnalysis]);

  const beforeQualityDimensions = useMemo(() => {
    if (!beforeAnalysis) return [];
    const rows = beforeAnalysis.rows_count || 1;
    const cols = beforeAnalysis.columns_count || 1;
    const totalCells = rows * cols;
    const missing = beforeAnalysis.missing_total || 0;
    const duplicates = beforeAnalysis.duplicate_count || 0;
    const invalidColsCount = beforeAnalysis.invalid_columns?.length || 0;

    const completeness = Math.round((1 - missing / totalCells) * 100);
    const uniqueness = Math.round((1 - duplicates / rows) * 100);
    const validity = Math.round((1 - invalidColsCount / cols) * 100);
    const overall = Math.round(beforeAnalysis.quality_score || 0);

    return [
      { name: "Completeness", value: completeness, fill: "#10b981" },
      { name: "Uniqueness", value: uniqueness, fill: "#2563eb" },
      { name: "Validity", value: validity, fill: "#f59e0b" },
      { name: "Overall", value: overall, fill: "#14b8a6" },
    ];
  }, [beforeAnalysis]);

  const afterQualityDimensions = useMemo(() => {
    if (!afterAnalysis) return [];
    const rows = afterAnalysis.rows_count || 1;
    const cols = afterAnalysis.columns_count || 1;
    const totalCells = rows * cols;
    const missing = afterAnalysis.missing_total || 0;
    const duplicates = afterAnalysis.duplicate_count || 0;
    const invalidColsCount = afterAnalysis.invalid_columns?.length || 0;

    const completeness = Math.round((1 - missing / totalCells) * 100);
    const uniqueness = Math.round((1 - duplicates / rows) * 100);
    const validity = Math.round((1 - invalidColsCount / cols) * 100);
    const overall = Math.round(afterAnalysis.quality_score || 0);

    return [
      { name: "Completeness", value: completeness, fill: "#10b981" },
      { name: "Uniqueness", value: uniqueness, fill: "#2563eb" },
      { name: "Validity", value: validity, fill: "#f59e0b" },
      { name: "Overall", value: overall, fill: "#14b8a6" },
    ];
  }, [afterAnalysis]);

  const dataTypeCounts = useMemo(() => {
    if (!analysis?.data_types) return [];
    const counts = { Numeric: 0, Categorical: 0, Boolean: 0, Other: 0 };
    Object.values(analysis.data_types).forEach((type) => {
      const t = String(type).toLowerCase();
      if (t.includes("int") || t.includes("float") || t.includes("number") || t.includes("double")) {
        counts.Numeric++;
      } else if (t.includes("bool")) {
        counts.Boolean++;
      } else if (t.includes("object") || t.includes("str") || t.includes("char") || t.includes("category")) {
        counts.Categorical++;
      } else {
        counts.Other++;
      }
    });
    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, count]) => ({ name, count }));
  }, [analysis]);

  const qualityDimensions = useMemo(() => {
    if (!analysis) return [];
    const rows = analysis.rows_count || 1;
    const cols = analysis.columns_count || 1;
    const totalCells = rows * cols;
    const missing = analysis.missing_total || 0;
    const duplicates = analysis.duplicate_count || 0;
    const invalidColsCount = analysis.invalid_columns?.length || 0;

    const completeness = Math.round((1 - missing / totalCells) * 100);
    const uniqueness = Math.round((1 - duplicates / rows) * 100);
    const validity = Math.round((1 - invalidColsCount / cols) * 100);
    const overall = Math.round(analysis.quality_score || 0);

    return [
      { name: "Completeness", value: completeness, fill: "#10b981" },
      { name: "Uniqueness", value: uniqueness, fill: "#2563eb" },
      { name: "Validity", value: validity, fill: "#f59e0b" },
      { name: "Overall Quality", value: overall, fill: "#14b8a6" },
    ];
  }, [analysis]);

  if (!analysis || typeof analysis.rows_count === 'undefined' || typeof analysis.columns_count === 'undefined' || !analysis.data_types) {
    return (
      <section className="card empty-state text-center">
        <FileSpreadsheet size={48} className="text-primary animate-bounce" />
        <h2>Data Profiling Unavailable</h2>
        <p>This dataset does not contain valid profiling data, or the file is still importing/downloading. Please refresh in a moment or verify the dataset CSV format.</p>
        <button className="btn-primary" onClick={onBackToLibrary} style={{ maxWidth: "200px", margin: "16px auto 0" }}>
          Go to Library Store
        </button>
      </section>
    );
  }



  return (
    <section className="dashboard animate-fade-in">
      {/* Printable Report Container (Hidden on Screen, Shown in PDF/Print) */}
      <div id="pdf-report-content" className="print-report-container">
        <div className="print-only-header">
          <h1>Data Quality & ML Platform Analysis Report</h1>
          <div className="print-meta-grid">
            <div>Dataset Name: <strong>{dataset.filename}</strong></div>
            <div>Generated Date: <strong>{new Date().toLocaleString()}</strong></div>
            <div>Platform Status: <strong>{dataset.status.toUpperCase()}</strong></div>
            <div>Uploader Name: <strong>{dataset.owner_name || "Unknown"}</strong></div>
          </div>
        </div>

        {/* Quality Metrics Comparison table */}
        <div className="card print-report-card">
          <h2>Dataset Quality Comparison (Before vs After Processing)</h2>
          <table className="print-comparison-table">
            <thead>
              <tr>
                <th>Quality Dimension</th>
                <th>Before Processing (Raw Upload)</th>
                <th>After Processing (Current State)</th>
                <th>Difference / Improvement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Overall Quality Score</strong></td>
                <td><span className="quality-badge before">{beforeAnalysis.quality_score}%</span></td>
                <td><span className="quality-badge after">{afterAnalysis.quality_score}%</span></td>
                <td>
                  {afterAnalysis.quality_score > beforeAnalysis.quality_score ? (
                    <span className="improvement-positive">+{Math.round((afterAnalysis.quality_score - beforeAnalysis.quality_score) * 100) / 100}% Improvement</span>
                  ) : afterAnalysis.quality_score < beforeAnalysis.quality_score ? (
                    <span className="improvement-negative">{Math.round((afterAnalysis.quality_score - beforeAnalysis.quality_score) * 100) / 100}% Difference</span>
                  ) : (
                    <span className="improvement-neutral">No Change</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Row Count</strong></td>
                <td>{beforeAnalysis.rows_count.toLocaleString()}</td>
                <td>{afterAnalysis.rows_count.toLocaleString()}</td>
                <td>
                  {afterAnalysis.rows_count < beforeAnalysis.rows_count ? (
                    <span className="improvement-positive">-{beforeAnalysis.rows_count - afterAnalysis.rows_count} Outliers Removed</span>
                  ) : (
                    <span className="improvement-neutral">No Change</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Column Count</strong></td>
                <td>{beforeAnalysis.columns_count}</td>
                <td>{afterAnalysis.columns_count}</td>
                <td>
                  {afterAnalysis.columns_count > beforeAnalysis.columns_count ? (
                    <span className="improvement-positive">+{afterAnalysis.columns_count - beforeAnalysis.columns_count} Dummy Columns Added</span>
                  ) : (
                    <span className="improvement-neutral">No Change</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Missing Cells (Total)</strong></td>
                <td>{beforeAnalysis.missing_total.toLocaleString()}</td>
                <td>{afterAnalysis.missing_total.toLocaleString()}</td>
                <td>
                  {beforeAnalysis.missing_total > 0 && afterAnalysis.missing_total === 0 ? (
                    <span className="improvement-positive">All Missing Values Imputed (100% Resolved)</span>
                  ) : beforeAnalysis.missing_total > afterAnalysis.missing_total ? (
                    <span className="improvement-positive">-{beforeAnalysis.missing_total - afterAnalysis.missing_total} Missing Values Resolved</span>
                  ) : (
                    <span className="improvement-neutral">No Change</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Duplicate Rows</strong></td>
                <td>{beforeAnalysis.duplicate_count}</td>
                <td>{afterAnalysis.duplicate_count}</td>
                <td>
                  {beforeAnalysis.duplicate_count > 0 && beforeAnalysis.duplicate_count > afterAnalysis.duplicate_count ? (
                    <span className="improvement-positive">-{beforeAnalysis.duplicate_count - afterAnalysis.duplicate_count} Duplicates Removed (100% Cleaned)</span>
                  ) : (
                    <span className="improvement-neutral">No Change</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Quality Dimensions Charts Comparison */}
        <div className="card print-report-card" style={{ pageBreakInside: "avoid" }}>
          <h2>Quality Dimensions Comparison</h2>
          <div className="print-visualization-grid">
            <div className="print-chart-box">
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0b0f19", marginBottom: "12px", textAlign: "center" }}>Before Processing (%)</h3>
              <BarChart width={330} height={200} data={beforeQualityDimensions} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {beforeQualityDimensions.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} formatter={(v) => `${v}%`} />
                </Bar>
              </BarChart>
            </div>
            <div className="print-chart-box">
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0b0f19", marginBottom: "12px", textAlign: "center" }}>After Processing (%)</h3>
              <BarChart width={330} height={200} data={afterQualityDimensions} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {afterQualityDimensions.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} formatter={(v) => `${v}%`} />
                </Bar>
              </BarChart>
            </div>
          </div>
        </div>

        {/* Data Type Composition Comparison */}
        <div className="card print-report-card" style={{ pageBreakInside: "avoid" }}>
          <h2>Column Data Type Composition Comparison</h2>
          <div className="print-visualization-grid">
            <div className="print-chart-box">
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0b0f19", marginBottom: "12px", textAlign: "center" }}>Before Processing (Column Count)</h3>
              <BarChart width={330} height={200} data={beforeDataTypeCounts} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  {beforeDataTypeCounts.map((entry, index) => (
                    <Cell key={entry.name} fill={index === 0 ? "#2563eb" : index === 1 ? "#14b8a6" : index === 2 ? "#f59e0b" : "#6366f1"} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} />
                </Bar>
              </BarChart>
            </div>
            <div className="print-chart-box">
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0b0f19", marginBottom: "12px", textAlign: "center" }}>After Processing (Column Count)</h3>
              <BarChart width={330} height={200} data={afterDataTypeCounts} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  {afterDataTypeCounts.map((entry, index) => (
                    <Cell key={entry.name} fill={index === 0 ? "#2563eb" : index === 1 ? "#14b8a6" : index === 2 ? "#f59e0b" : "#6366f1"} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} />
                </Bar>
              </BarChart>
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b", fontStyle: "italic", textAlign: "center", lineHeight: "1.4" }}>
            <strong>Note on Column Composition:</strong> If the before and after compositions are identical, only <strong>Data Cleaning</strong> was performed. Executing the <strong>Feature Preprocessing</strong> step in the pipeline will encode categorical variables (converting Categorical columns to Numeric/Boolean) and scale features.
          </div>
        </div>

        {/* Transformation Narrative & Verification Summary */}
        <div className="card print-report-card" style={{ pageBreakInside: "avoid" }}>
          <h2>Transformation Narrative & Verification Summary</h2>
          <div className="print-narrative-content" style={{ fontSize: "12.5px", lineHeight: "1.6", color: "#334155", textAlign: "justify" }}>
            <p style={{ marginBottom: "12px" }}>
              <strong>1. Data Cleaning & Quality Enhancements:</strong> The raw uploaded dataset named <strong>{dataset.filename}</strong> originally comprised <strong>{beforeAnalysis.rows_count.toLocaleString()} rows</strong>, <strong>{beforeAnalysis.columns_count} columns</strong>, and <strong>{beforeAnalysis.missing_total.toLocaleString()} missing cells</strong>. By executing the pipeline with the <strong>{analysis.imputation_strategy || "median"}</strong> imputation strategy, the system resolved all missing numerical entries. Duplicate rows were automatically dropped, boosting the overall quality score from <strong>{beforeAnalysis.quality_score}%</strong> to <strong>{afterAnalysis.quality_score}%</strong>.
            </p>
            {analysis.preprocessing_report && (
              <p style={{ marginBottom: "12px" }}>
                <strong>2. Feature Preprocessing & Engineering:</strong> To prepare features for machine learning models, outliers were treated based on the chosen strategy. Original continuous features were scaled to a uniform range, and categorical string features (including <em>{analysis.preprocessing_report.encoded_columns?.slice(0, 3).join(", ") || "none"}</em>) were one-hot encoded into numeric dummy columns. The preprocessed dataset has been restructured to <strong>{afterAnalysis.columns_count} feature columns</strong>.
              </p>
            )}
            {analysis.training_report && (
              <p style={{ marginBottom: "0px" }}>
                <strong>3. Machine Learning Training Proof:</strong> The preprocessed dataset was split into an 80/20 train-test ratio, allocating <strong>{analysis.training_report.train_rows} rows for training</strong> and <strong>{analysis.training_report.test_rows} rows for validation</strong>. Multiple algorithms (Random Forests, Gradient Boosting, SVM, XGBoost, and CatBoost) were trained and evaluated against the target column <strong>"{analysis.training_report.target_column}"</strong>. The highest-performing model selected was <strong>{analysis.training_report.model_type}</strong>, achieving a validation metric of 
                {analysis.training_report.metrics?.accuracy !== undefined && (
                  <span> <strong>Accuracy: {(analysis.training_report.metrics.accuracy * 100).toFixed(2)}%</strong></span>
                )}
                {analysis.training_report.metrics?.r2_score !== undefined && (
                  <span> <strong>R² Score: {analysis.training_report.metrics.r2_score.toFixed(4)}</strong></span>
                )}
                , certifying it as fully trained and verified for predictions.
              </p>
            )}
          </div>
        </div>

        {/* Data Science Pipeline Concepts & Transformation Methodology (PDF/Print only) */}
        <div className="card print-report-card" style={{ pageBreakInside: "avoid" }}>
          <h2>Data Science Pipeline Concepts & Transformation Methodology</h2>
          <div className="print-methodology-content" style={{ fontSize: "11.5px", lineHeight: "1.5", color: "#334155" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
              <div style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>1. Data Imputation & Cleaning</h3>
                <p style={{ margin: 0, textAlign: "justify" }}>
                  Missing numerical values are resolved using <strong>{analysis.imputation_strategy || "median"}</strong> imputation, replacing blank cells with calculated values to avoid discarding records. Categorical columns are imputed using the <strong>mode</strong> (most frequent value). This maintains dataset sample size, avoids algorithmic training failures, and preserves feature covariance.
                </p>
              </div>
              <div style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>2. Outlier Capping (IQR / Z-Score)</h3>
                <p style={{ margin: 0, textAlign: "justify" }}>
                  Extreme values can severely distort model scaling and gradient weight updates. We apply outlier capping using the IQR rule (values clipped outside 1.5x the Interquartile Range) or Z-score limits (3 standard deviations). This ensures robust model estimation without omitting valid data points.
                </p>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>3. One-Hot Encoding & Scaling</h3>
                <p style={{ margin: 0, textAlign: "justify" }}>
                  Machine learning algorithms require numeric matrix inputs. Categorical columns are encoded via <strong>One-Hot Encoding</strong>, creating binary dummy features. Continuous columns are transformed via <strong>StandardScaler</strong> to have a mean of 0 and variance of 1, preventing high-magnitude columns from dominating the model gradient.
                </p>
              </div>
              <div style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>4. Predictive Modeling & Evaluation</h3>
                <p style={{ margin: 0, textAlign: "justify" }}>
                  The dataset is split into an 80/20 train/test split. Five algorithms (Random Forest, Gradient Boosting, SVM, XGBoost, CatBoost) are trained. Classification models are evaluated using <strong>Accuracy</strong> (proportion of correct predictions), and regression models are evaluated using the <strong>R² score</strong> (coefficient of determination representing explained variance).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Processing Proof & Certification */}
        <div className="card print-report-card" style={{ pageBreakInside: "avoid" }}>
          <h2>Pipeline Processing Proof & Certification Summary</h2>
          <div className="print-visualization-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="print-chart-box" style={{ fontSize: "12px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>1. Data Cleaning</h3>
              <div>Strategy: <strong>{analysis.imputation_strategy || "None"}</strong></div>
              <div>Status: <strong>{analysis.imputation_strategy ? "CLEANED" : "PENDING"}</strong></div>
            </div>
            <div className="print-chart-box" style={{ fontSize: "12px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>2. Preprocessing</h3>
              {analysis.preprocessing_report ? (
                <>
                  <div>Scaling: <strong>{analysis.preprocessing_report.scaled_columns?.length > 0 ? "StandardScaler" : "None"}</strong></div>
                  <div>Outliers: <strong>{analysis.preprocessing_report.outlier_treatment?.length > 0 ? "Capped/Removed" : "None"}</strong></div>
                  <div>Encoded: <strong>{analysis.preprocessing_report.encoded_columns?.length || 0} columns</strong></div>
                </>
              ) : (
                <div>Status: <strong>PENDING</strong></div>
              )}
            </div>
            <div className="print-chart-box" style={{ fontSize: "12px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>3. Model Training</h3>
              {analysis.training_report ? (
                <>
                  <div>Algorithm: <strong>{analysis.training_report.model_type}</strong></div>
                  <div>Target: <strong>{analysis.training_report.target_column}</strong></div>
                  {analysis.training_report.metrics?.accuracy !== undefined && (
                    <div>Accuracy: <strong>{(analysis.training_report.metrics.accuracy * 100).toFixed(2)}%</strong></div>
                  )}
                  {analysis.training_report.metrics?.r2_score !== undefined && (
                    <div>R² Score: <strong>{analysis.training_report.metrics.r2_score.toFixed(4)}</strong></div>
                  )}
                </>
              ) : (
                <div>Status: <strong>PENDING</strong></div>
              )}
            </div>
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", marginTop: "16px", fontStyle: "italic", textAlign: "center" }}>
            This transformation report acts as verifiable proof of dataset pipeline execution. Quality parameters have been validated via python open-source machine learning libraries (pandas, scikit-learn, xgboost, catboost) in accordance with the user lineage logs.
          </p>
        </div>
      </div>

      <div className="workspace-nav-bar">
        <button className="btn-back-link" onClick={onBackToLibrary}>
          ← Back to Dataset Library
        </button>
        {datasets.length > 0 && (
          <div className="dataset-switcher-wrap">
            <label htmlFor="switcher-select">Switch Dataset:</label>
            <select
              id="switcher-select"
              className="switcher-select"
              value={dataset?.id || ""}
              onChange={(e) => onSwitchDataset(Number(e.target.value))}
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.filename} ({ds.quality_score}% Quality)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="dataset-header-panel">
        <div>
          <h2>{dataset.filename}</h2>
          <p className="text-sm muted">Status: <span className={`status badge-${dataset.status}`}>{dataset.status}</span> • Uploaded by: {dataset.owner_name || "Unknown"}</p>
        </div>
        <div className="download-header-group" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="download-panel-box" style={{ background: "rgba(30, 41, 59, 0.4)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "4px 12px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="text-xs font-bold" style={{ textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)" }}>Raw:</span>
              <button className="btn-sm btn-secondary" style={{ padding: "4px 8px", fontSize: "11px", height: "auto" }} onClick={() => onDownload(dataset, "csv", "raw")}>
                CSV
              </button>
              <button className="btn-sm btn-secondary" style={{ padding: "4px 8px", fontSize: "11px", height: "auto" }} onClick={() => onDownload(dataset, "excel", "raw")}>
                Excel
              </button>
            </div>
            <div style={{ width: "1px", height: "18px", background: "var(--border-color)" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="text-xs font-bold" style={{ textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)" }}>Processed:</span>
              {dataset.status === "analyzed" ? (
                <span className="text-xs" style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "11px" }}>Pending Run...</span>
              ) : (
                <>
                  <button className="btn-sm btn-success" style={{ padding: "4px 8px", fontSize: "11px", height: "auto", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981" }} onClick={() => onDownload(dataset, "csv", "processed")}>
                    CSV
                  </button>
                  <button className="btn-sm btn-success" style={{ padding: "4px 8px", fontSize: "11px", height: "auto", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981" }} onClick={() => onDownload(dataset, "excel", "processed")}>
                    Excel
                  </button>
                </>
              )}
            </div>
          </div>
          <button className="btn-secondary" title="Print Report" onClick={() => window.print()} style={{ padding: "10px" }}>
            <Printer size={18} color="#38bdf8" />
          </button>
          <button className="btn-secondary" title="Download PDF" onClick={handleDownloadPDF} style={{ padding: "10px" }}>
            <FileDown size={18} color="#10b981" />
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <Metric icon={Sparkles} label="Overall Quality" value={`${analysis.quality_score}%`} />
        <Metric icon={Database} label="Row Count" value={analysis.rows_count.toLocaleString()} />
        <Metric icon={FileSpreadsheet} label="Column Count" value={analysis.columns_count} />
        <Metric icon={CheckCircle2} label="Duplicates Found" value={analysis.duplicate_count} />
      </div>

      <div className="pipeline-workspace">
        <div className="pipeline-tabs-sidebar">
          <button className={pipelineTab === "clean" ? "active" : ""} onClick={() => setPipelineTab("clean")}>
            <Sparkles size={16} /> 1. Data Cleaning
          </button>
          <button className={pipelineTab === "preprocess" ? "active" : ""} onClick={() => setPipelineTab("preprocess")}>
            <Settings2 size={16} /> 2. Preprocessing
          </button>
          <button className={pipelineTab === "train" ? "active" : ""} onClick={() => setPipelineTab("train")}>
            <BrainCircuit size={16} /> 3. Model Training
          </button>
          <button className={pipelineTab === "profile" ? "active" : ""} onClick={() => setPipelineTab("profile")}>
            <Database size={16} /> 4. Schema & Profiler
          </button>
        </div>

        <div className="pipeline-content-area">
          {pipelineTab === "clean" && (
            <div className="pipeline-tab-pane animate-fade-in">
              <h3>Clean Missing & Duplicate Values</h3>
              <p className="muted text-sm mb-4">Removes duplicates and fills missing values utilizing selected algorithms.</p>
              
              <div className="form-group mb-4">
                <label htmlFor="strategy-select">Numeric Imputation Method</label>
                <select
                  id="strategy-select"
                  value={imputation}
                  onChange={(e) => setImputation(e.target.value)}
                  className="form-control"
                >
                  <option value="median">(Recommended) Median Imputation</option>
                  <option value="mean">Mean Imputation</option>
                  <option value="mode">Mode Imputation</option>
                  <option value="knn">K-Nearest Neighbors (KNN) Imputer</option>
                  <option value="constant">Zero/Constant Imputation</option>
                </select>
              </div>

              <button className="btn-primary" onClick={() => onClean(imputation)}>
                Execute Cleaning Pipeline
              </button>
            </div>
          )}

          {pipelineTab === "preprocess" && (
            <div className="pipeline-tab-pane animate-fade-in">
              <h3>Preprocessing & Outlier Treatment</h3>
              <p className="muted text-sm mb-4">Transform features, handle outliers, and normalise numeric attributes.</p>

              <div className="two-column mb-4">
                <div className="form-group">
                  <label htmlFor="outliers-select">Outlier Treatment Method</label>
                  <select
                    id="outliers-select"
                    value={outliers}
                    onChange={(e) => setOutliers(e.target.value)}
                    className="form-control"
                  >
                    <option value="iqr">(Recommended) IQR Capping</option>
                    <option value="isolation_forest">Isolation Forest Anomaly Removal</option>
                    <option value="zscore">Z-Score Capping (&gt;3σ)</option>
                    <option value="none">Ignore Outliers</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="scaling-select">Feature Scaling</label>
                  <select
                    id="scaling-select"
                    value={scaling}
                    onChange={(e) => setScaling(e.target.value)}
                    className="form-control"
                  >
                    <option value="standard">(Recommended) Z-Score Standardization</option>
                    <option value="minmax">Min-Max Normalization (0 to 1)</option>
                    <option value="robust">Robust Scaling (IQR median)</option>
                    <option value="none">Ignore Scaling</option>
                  </select>
                </div>
              </div>

              <button className="btn-primary" onClick={() => onPreprocess(outliers, scaling, targetColumn)}>
                Execute Preprocessing
              </button>
            </div>
          )}

          {pipelineTab === "train" && (
            <div className="pipeline-tab-pane animate-fade-in">
              <h3>Evaluate Predictive Models</h3>
              <p className="muted text-sm mb-4">Configure targets and algorithms. The platform splits features automatically (80/20 train/test).</p>

              <div className="two-column mb-4">
                <div className="form-group">
                  <label htmlFor="target-select">Predictive Target Column</label>
                  <select
                    id="target-select"
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="form-control"
                  >
                    <option value="Total Dataset">Total Dataset (Use last column as target)</option>
                    {analysis.column_names.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="algo-select">Model Algorithm</label>
                  <select
                    id="algo-select"
                    value={algo}
                    onChange={(e) => setAlgo(e.target.value)}
                    className="form-control"
                  >
                    <option value="auto">Auto-select Best Classifier/Regressor</option>
                    <option value="random_forest">Random Forest</option>
                    <option value="linear_regression">Linear Regression (for numeric targets)</option>
                    <option value="logistic_regression">Logistic Regression (for labels)</option>
                    <option value="gradient_boosting">Gradient Boosting Regressor</option>
                    <option value="svm">Support Vector Machine (SVC)</option>
                    <option value="xgboost">XGBoost (Extreme Gradient Boosting)</option>
                    <option value="catboost">CatBoost (Categorical Boosting)</option>
                  </select>
                </div>
              </div>

              <button className="btn-primary" onClick={() => onTrain(targetColumn, algo)}>
                Train & Evaluate Model
              </button>
            </div>
          )}

          {pipelineTab === "profile" && (
            <div className="pipeline-tab-pane animate-fade-in">
              <h3>Schema & Column Profile</h3>
              <p className="muted text-sm mb-4">Detailed technical breakdown of all detected columns, data types, and completeness statistics.</p>
              
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Column Name</th>
                      <th>Data Type</th>
                      <th>Missing Count</th>
                      <th>Missing Ratio</th>
                      <th>Completeness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.column_names.map((col) => {
                      const type = analysis.data_types[col] || "unknown";
                      const missing = analysis.missing_by_column[col] || 0;
                      const missingRatio = analysis.rows_count ? (missing / analysis.rows_count) : 0;
                      const completeness = (100 - (missingRatio * 100)).toFixed(1);
                      return (
                        <tr key={col}>
                          <td><strong>{col}</strong></td>
                          <td><code className="text-xs">{type}</code></td>
                          <td>{missing}</td>
                          <td>{(missingRatio * 100).toFixed(1)}%</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ flex: 1, height: "6px", background: "var(--border-color)", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${completeness}%`, background: parseFloat(completeness) > 90 ? "var(--color-success)" : parseFloat(completeness) > 50 ? "var(--color-warning)" : "var(--color-danger)" }}></div>
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: "600", width: "40px", textAlign: "right" }}>{completeness}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="two-column">
        <div className="card">
          <h2>Missing Attributes Report (Cells)</h2>
          <p className="muted text-sm mb-4">Total count of missing data cells per column (lower is better).</p>
          <div className="chart-box">
            {isPrinting ? (
              <BarChart width={330} height={260} data={missingChart} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: 'Missing Cells', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc" }} />
                <Bar dataKey="missing" radius={[6, 6, 0, 0]}>
                  {missingChart.map((entry, index) => (
                    <Cell key={entry.name} fill={index % 2 ? "#2563eb" : "#14b8a6"} />
                  ))}
                  <LabelList dataKey="missing" position="top" style={{ fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} />
                </Bar>
              </BarChart>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={missingChart} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: 'Missing Cells', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc" }} />
                  <Bar dataKey="missing" radius={[6, 6, 0, 0]}>
                    {missingChart.map((entry, index) => (
                      <Cell key={entry.name} fill={index % 2 ? "#2563eb" : "#14b8a6"} />
                    ))}
                    <LabelList dataKey="missing" position="top" style={{ fill: "#cbd5e1", fontSize: 10, fontWeight: "bold" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Column Completeness Profile (%)</h2>
          <p className="muted text-sm mb-4">Percentage of populated cells per column (higher is better).</p>
          <div className="chart-box">
            {isPrinting ? (
              <BarChart width={330} height={260} data={completenessData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc" }} />
                <Bar dataKey="completeness" radius={[0, 4, 4, 0]}>
                  {completenessData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.completeness >= 90 ? "#10b981" : entry.completeness >= 60 ? "#f59e0b" : "#ef4444"} />
                  ))}
                  <LabelList dataKey="completeness" position="right" style={{ fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} formatter={(v) => `${v}%`} />
                </Bar>
              </BarChart>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={completenessData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc" }} />
                  <Bar dataKey="completeness" radius={[0, 4, 4, 0]}>
                    {completenessData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.completeness >= 90 ? "#10b981" : entry.completeness >= 60 ? "#f59e0b" : "#ef4444"} />
                    ))}
                    <LabelList dataKey="completeness" position="right" style={{ fill: "#cbd5e1", fontSize: 10, fontWeight: "bold" }} formatter={(v) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Processing Proof & Certification */}
      <div className="card print-proof-card" style={{ pageBreakInside: "avoid" }}>
        <h2>Dataset Processing & Pipeline Proof</h2>
        <p className="muted text-sm mb-4">Verification and certification of the data cleaning, preprocessing, and machine learning models applied to this dataset.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", flexWrap: "wrap" }} className="proof-grid-print">
          {/* Cleaning Proof */}
          <div style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>1. Data Cleaning</h3>
            {analysis.imputation_strategy ? (
              <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
                <p style={{ margin: "0 0 6px 0" }}>Status: <span className="status badge-cleaning" style={{ padding: "2px 6px", fontSize: "10px" }}>CLEANED</span></p>
                <p style={{ margin: "0 0 4px 0" }}>Method: <strong>{analysis.imputation_strategy.toUpperCase()}</strong> Imputation</p>
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>Missing values in numeric attributes successfully resolved. Completeness restored to 100%.</p>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                Pending. Execute the Data Cleaning pipeline to resolve missing cells.
              </div>
            )}
          </div>

          {/* Preprocessing Proof */}
          <div style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>2. Preprocessing</h3>
            {analysis.preprocessing_report ? (
              <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
                <p style={{ margin: "0 0 6px 0" }}>Status: <span className="status badge-preprocessing" style={{ padding: "2px 6px", fontSize: "10px" }}>PROCESSED</span></p>
                <p style={{ margin: "0 0 4px 0" }}>Scaling: <strong>{analysis.preprocessing_report.scaling_method || "standard"}</strong></p>
                <p style={{ margin: "0 0 4px 0" }}>Outliers: <strong>{analysis.preprocessing_report.outlier_method || "iqr"}</strong></p>
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                  Resolved {analysis.preprocessing_report.removed_duplicates || 0} duplicates. 
                  Scaled: {analysis.preprocessing_report.scaled_columns?.join(", ") || "None"}.
                </p>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                Pending. Execute Feature Preprocessing to normalize numeric attributes.
              </div>
            )}
          </div>

          {/* Model Training Proof */}
          <div style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>3. Model Training</h3>
            {analysis.training_report ? (
              <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
                <p style={{ margin: "0 0 6px 0" }}>Status: <span className="status badge-training" style={{ padding: "2px 6px", fontSize: "10px" }}>TRAINED</span></p>
                <p style={{ margin: "0 0 4px 0" }}>Algorithm: <strong>{analysis.training_report.algo || "Auto"}</strong></p>
                <p style={{ margin: "0 0 4px 0" }}>Target: <strong>{analysis.training_report.target_column}</strong></p>
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                  Score: <strong>
                    {analysis.training_report.metrics?.accuracy ? `Accuracy: ${(analysis.training_report.metrics.accuracy * 100).toFixed(2)}%` : 
                     analysis.training_report.metrics?.r2_score ? `R²: ${analysis.training_report.metrics.r2_score.toFixed(4)}` : 
                     `MAE: ${analysis.training_report.metrics?.mean_absolute_error?.toFixed(4) || "N/A"}`}
                  </strong>
                </p>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                Pending. Select a target column and train a model to evaluate predictions.
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(20, 184, 166, 0.05)", borderLeft: "3px solid var(--color-cyan)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          <strong>Certification Statement:</strong> This report acts as a verifiable proof of dataset integrity. The records have been subjected to standard validation rules, data cleaning imputations, feature standardizations, and cross-validation model evaluations using standard data science libraries (pandas, scikit-learn, xgboost, catboost) in accordance with the pipeline log configurations.
        </div>
      </div>

      {(analysis.preprocessing_report || analysis.training_report) && (
        <div className="two-column">
          <div className="card">
            <h2>Transformation Logs</h2>
            {analysis.preprocessing_report ? (
              <div className="preprocessing-report-details">
                <ReportList title="Transformation Steps Completed" items={analysis.preprocessing_report.steps} />
                <ReportList title="Outliers Resolved" items={analysis.preprocessing_report.outlier_treatment} />
                <p className="muted small mt-4">
                  Final Schema: {analysis.preprocessing_report.final_rows.toLocaleString()} rows × {analysis.preprocessing_report.final_columns} attributes.
                </p>
              </div>
            ) : (
              <p className="muted text-sm">Run preprocessing to view transformation logs.</p>
            )}
          </div>
          <div className="card">
            <h2>Model Evaluation Report</h2>
            {analysis.training_report ? (
              <TrainingReport report={analysis.training_report} />
            ) : (
              <p className="muted text-sm">Configure target column and train a model to evaluate performance details.</p>
            )}
          </div>
        </div>
      )}

      {lineageLogs && lineageLogs.length > 0 && (
        <div className="card lineage-card">
          <h2>Data Lineage & Activity Audit Log</h2>
          <p className="muted text-sm mb-4">Historical timeline of all transformations and operations performed on this dataset.</p>
          <div className="timeline-container">
            {lineageLogs.map((log) => {
              let ActionIcon = Sparkles;
              if (log.action === "upload") {
                ActionIcon = Upload;
              } else if (log.action === "preprocessing") {
                ActionIcon = Settings2;
              } else if (log.action === "training") {
                ActionIcon = BrainCircuit;
              } else if (log.action === "export") {
                ActionIcon = Download;
              }

              return (
                <div key={log.id} className="timeline-item">
                  <div className="timeline-badge-wrap">
                    <div className={`timeline-icon-badge ${log.action}`}>
                      <ActionIcon size={14} />
                    </div>
                    <div className="timeline-line"></div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong className="timeline-action">
                        {log.action === "upload" && "Dataset Uploaded"}
                        {log.action === "cleaning" && "Data Cleaned"}
                        {log.action === "preprocessing" && "Features Preprocessed"}
                        {log.action === "training" && "Predictive Model Trained"}
                        {log.action === "export" && "Dataset Exported"}
                      </strong>
                      <span className="timeline-time">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="timeline-details">{log.details}</p>
                    <span className="timeline-user">Performed by: <strong>{log.user_name}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="two-column">
        <div className="card">
          <h2>Validation Warnings</h2>
          {analysis.invalid_columns.length === 0 ? (
            <p className="success text-sm">No validation failures or anomalies detected.</p>
          ) : (
            <ul className="issue-list">
              {analysis.invalid_columns.map((item) => (
                <li key={item.column} className="issue-item">
                  <strong>{item.column}</strong>
                  <span>{item.issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Data Preview (First 10 Rows)</h2>
          <div className="table-wrap mini-preview-table">
            <table>
              <thead>
                <tr>
                  {analysis.column_names.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.preview.map((row, index) => (
                  <tr key={index}>
                    {analysis.column_names.map((col) => (
                      <td key={col}>{String(row[col] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {analysis.numeric_summary && Object.keys(analysis.numeric_summary).length > 0 && (
        <div className="card mt-6" style={{ overflowX: "auto" }}>
          <h2>Numeric Descriptive Statistics</h2>
          <p className="muted text-sm mb-4">Summary statistics for numerical columns calculated dynamically via pandas.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Count</th>
                  <th>Mean</th>
                  <th>Std Dev</th>
                  <th>Min</th>
                  <th>25%</th>
                  <th>50% (Median)</th>
                  <th>75%</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analysis.numeric_summary).map(([col, stats]) => (
                  <tr key={col}>
                    <td><strong>{col}</strong></td>
                    <td>{stats.count !== undefined ? stats.count.toLocaleString() : "0"}</td>
                    <td>{stats.mean !== undefined ? stats.mean.toFixed(2) : "0"}</td>
                    <td>{stats.std !== undefined ? stats.std.toFixed(2) : "0"}</td>
                    <td>{stats.min !== undefined ? stats.min.toLocaleString() : "0"}</td>
                    <td>{stats["25%"] !== undefined ? stats["25%"].toLocaleString() : "0"}</td>
                    <td>{stats["50%"] !== undefined ? stats["50%"].toLocaleString() : "0"}</td>
                    <td>{stats["75%"] !== undefined ? stats["75%"].toLocaleString() : "0"}</td>
                    <td>{stats.max !== undefined ? stats.max.toLocaleString() : "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function UserProfileView({ userProfile, onProfileUpdate, onPasswordChange, theme, setTheme, onLogout }) {
  const [activeSubTab, setActiveSubTab] = useState("profile"); // profile, password, delete_account, terms, about, theme, contact
  const [profileForm, setProfileForm] = useState({
    name: userProfile?.name || "",
    email: userProfile?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Account deletion states
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        name: userProfile.name,
        email: userProfile.email,
      });
    }
  }, [userProfile]);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setUpdatingProfile(true);
    try {
      await onProfileUpdate(profileForm);
      setProfileSuccess("Profile details updated successfully.");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await onPasswordChange({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });
      setPasswordSuccess("Password changed successfully.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (!deleteConfirm) {
      setDeleteError("Please check the confirmation box to proceed.");
      return;
    }
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await deleteMe();
      alert("Your account has been permanently deleted.");
      onLogout();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <section className="profile-section">
      <div className="settings-layout">
        <aside className="settings-sidebar">
          {/* Top User Profile details as per the reference drawing */}
          <div className="settings-user-profile" style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            paddingBottom: "16px",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "16px"
          }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(6, 182, 212, 0.1)",
              border: "2px solid var(--color-cyan)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-cyan)",
              fontSize: "18px",
              fontWeight: "700"
            }}>
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : <User size={18} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "14px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {userProfile?.name || "User"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {userProfile?.email || "email@example.com"}
              </span>
            </div>
          </div>

          <div className="settings-group-label" style={{
            fontSize: "10px",
            fontWeight: "700",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            letterSpacing: "0.05em",
            margin: "4px 0 6px 4px"
          }}>
            Account
          </div>
          
          <button 
            className={`settings-tab-btn ${activeSubTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveSubTab("profile")}
          >
            <User size={14} />
            <span>Profile Settings</span>
          </button>
          
          <button 
            className={`settings-tab-btn ${activeSubTab === "password" ? "active" : ""}`}
            onClick={() => setActiveSubTab("password")}
          >
            <Key size={14} />
            <span>Change Password</span>
          </button>
          
          <button 
            className={`settings-tab-btn ${activeSubTab === "delete_account" ? "active" : ""}`}
            onClick={() => setActiveSubTab("delete_account")}
            style={{ color: "#ef4444" }}
          >
            <ShieldAlert size={14} />
            <span>Delete Account</span>
          </button>

          <div style={{ height: "1px", background: "var(--border-color)", margin: "8px 0" }}></div>

          <div className="settings-group-label" style={{
            fontSize: "10px",
            fontWeight: "700",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            letterSpacing: "0.05em",
            margin: "4px 0 6px 4px"
          }}>
            Platform
          </div>

          <button 
            className={`settings-tab-btn ${activeSubTab === "terms" ? "active" : ""}`}
            onClick={() => setActiveSubTab("terms")}
          >
            <FileText size={14} />
            <span>Terms & Conditions</span>
          </button>

          <button 
            className={`settings-tab-btn ${activeSubTab === "about" ? "active" : ""}`}
            onClick={() => setActiveSubTab("about")}
          >
            <BrainCircuit size={14} />
            <span>About Project</span>
          </button>

          <button 
            className={`settings-tab-btn ${activeSubTab === "theme" ? "active" : ""}`}
            onClick={() => setActiveSubTab("theme")}
          >
            <Sparkle size={14} />
            <span>Theme Selection</span>
          </button>

          <button 
            className={`settings-tab-btn ${activeSubTab === "contact" ? "active" : ""}`}
            onClick={() => setActiveSubTab("contact")}
          >
            <Mail size={14} />
            <span>Contact Us</span>
          </button>

          <div style={{ height: "1px", background: "var(--border-color)", margin: "8px 0" }}></div>

          <button 
            className="settings-tab-btn logout-item"
            onClick={onLogout}
            style={{ color: "#ef4444", marginTop: "16px" }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </aside>

        <div className="settings-content">
          {activeSubTab === "profile" && (
            <div className="card animate-fade-in">
              <h2>Profile Settings</h2>
              <p className="muted text-sm mb-4">Manage your personal account details (full name and registered Gmail address).</p>

              <form onSubmit={handleUpdateProfile} className="auth-form" style={{ maxWidth: "480px" }}>
                <div className="form-group">
                  <label htmlFor="profile-name">Full Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-email">Gmail Address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </div>

                {profileError && <p className="error-message"><ShieldAlert size={14} /> {profileError}</p>}
                {profileSuccess && <p className="success text-sm">{profileSuccess}</p>}

                <button type="submit" disabled={updatingProfile} className="btn-primary" style={{ maxWidth: "200px" }}>
                  {updatingProfile ? "Saving..." : "Update Profile"}
                </button>
              </form>
            </div>
          )}

          {activeSubTab === "password" && (
            <div className="card animate-fade-in">
              <h2>Security & Password</h2>
              <p className="muted text-sm mb-4">Update your password regularly to maintain a high level of security.</p>

              <form onSubmit={handleChangePassword} className="auth-form" style={{ maxWidth: "480px" }}>
                <div className="form-group">
                  <label htmlFor="current-pwd">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="current-pwd"
                      type={showCurrentPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    >
                      {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="new-pwd">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-pwd"
                      type={showNewPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                    >
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-pwd">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirm-pwd"
                      type={showConfirmPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    >
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {passwordError && <p className="error-message"><ShieldAlert size={14} /> {passwordError}</p>}
                {passwordSuccess && <p className="success text-sm">{passwordSuccess}</p>}

                <button type="submit" disabled={updatingPassword} className="btn-primary" style={{ maxWidth: "200px" }}>
                  {updatingPassword ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
          )}

          {activeSubTab === "delete_account" && (
            <div className="card animate-fade-in" style={{ border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <h2 style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldAlert size={20} />
                <span>Delete Account Permanently</span>
              </h2>
              <p className="muted text-sm mb-4">This action is highly destructive and completely irreversible.</p>

              <div style={{ 
                background: "rgba(239, 68, 68, 0.05)", 
                borderLeft: "3px solid #ef4444", 
                padding: "16px", 
                borderRadius: "var(--radius-sm)", 
                marginBottom: "24px",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "var(--text-secondary)"
              }}>
                Deleting your account will permanently purge all datasets, validation reports, trained models, and history logs from our servers. You will be logged out immediately and your credentials will be deactivated.
              </div>

              <form onSubmit={handleDeleteAccount} className="auth-form" style={{ maxWidth: "480px" }}>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px", flexDirection: "row" }}>
                  <input
                    id="delete-confirm-chk"
                    type="checkbox"
                    checked={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.checked)}
                    style={{ width: "20px", height: "20px", cursor: "pointer", flexShrink: 0 }}
                  />
                  <label htmlFor="delete-confirm-chk" style={{ cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: "500", margin: 0 }}>
                    I understand that this action cannot be undone.
                  </label>
                </div>

                {deleteError && <p className="error-message"><ShieldAlert size={14} /> {deleteError}</p>}

                <button 
                  type="submit" 
                  disabled={deletingAccount} 
                  className="btn-danger" 
                  style={{ 
                    maxWidth: "240px", 
                    backgroundColor: "#ef4444", 
                    color: "white", 
                    border: "none", 
                    padding: "10px 20px", 
                    borderRadius: "var(--radius-sm)", 
                    cursor: "pointer",
                    fontWeight: "600",
                    transition: "all 0.2s ease"
                  }}
                >
                  {deletingAccount ? "Deleting..." : "Permanently Delete My Account"}
                </button>
              </form>
            </div>
          )}

          {activeSubTab === "terms" && (
            <div className="card animate-fade-in">
              <h2>Terms & Conditions</h2>
              <p className="muted text-sm mb-4">Project data policies, privacy constraints, and user agreement statements.</p>
              
              <div style={{ lineHeight: "1.7", color: "var(--text-secondary)", fontSize: "14px" }}>
                <p className="mb-4">
                  The <strong>Data Quality Hub</strong> is provided for educational and data validation purposes. By uploading your datasets, you agree that files will be processed in secure, isolated runtime environments to calculate profiles, data distributions, and quality metrics.
                </p>
                <p className="mb-4">
                  Uploaded data is exclusively accessible by the dataset owner and authorized platform administrators to preserve privacy. Standard users can only view their own uploaded records, validation history, and model statistics.
                </p>
                <p>
                  The platform acts as a validation helper and does not guarantee model performance values; users should verify test results before deployment.
                </p>
              </div>
            </div>
          )}

          {activeSubTab === "about" && (
            <div className="card animate-fade-in">
              <h2>About the Project</h2>
              <p className="muted text-sm mb-4">Core capabilities and purpose of the Data Quality Hub.</p>
              
              <div style={{ lineHeight: "1.7", color: "var(--text-secondary)", fontSize: "14px" }}>
                <p>
                  Data Quality Hub is a comprehensive analytics and machine learning solution designed to automate data profiling, validation, and preprocessing. It checks uploaded datasets for errors, missing cells, outlier values, and datatype inconsistencies, allowing standard users to clean and upscale features. The platform is equipped with modern regression and classification algorithms to train predictive models, validate performance metrics, and export clean, production-ready files instantly.
                </p>
              </div>
            </div>
          )}

          {activeSubTab === "theme" && (
            <div className="card animate-fade-in">
              <h2>App Theme Selection</h2>
              <p className="muted text-sm mb-4">Select your preferred user interface appearance.</p>
              
              <div className="theme-selector-grid">
                <div 
                  className={`theme-card-option ${theme === "system" ? "active" : ""}`}
                  onClick={() => setTheme("system")}
                >
                  <div className="theme-icon-circle">
                    <Settings2 size={18} />
                  </div>
                  <span>System Default</span>
                </div>

                <div 
                  className={`theme-card-option ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <div className="theme-icon-circle">
                    <Sparkle size={18} />
                  </div>
                  <span>Light Mode</span>
                </div>

                <div 
                  className={`theme-card-option ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <div className="theme-icon-circle">
                    <BrainCircuit size={18} />
                  </div>
                  <span>Dark Mode</span>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "contact" && (
            <div className="card animate-fade-in">
              <h2>Contact Us</h2>
              <p className="muted text-sm mb-4">Reach out to the system administration team for support and queries.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    border: "1px solid var(--color-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-secondary)"
                  }}>
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>System Administrator</div>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "600" }}>Karava Nandeeswar Reddy</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(6, 182, 212, 0.1)",
                    border: "1px solid var(--color-cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-cyan)"
                  }}>
                    <Mail size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Gmail Address</div>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "600" }}>
                      <a href="mailto:nandeesh871@gmail.com" style={{ color: "inherit", textDecoration: "none" }}>nandeesh871@gmail.com</a>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid var(--color-success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-success)"
                  }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Phone Number</div>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "600" }}>+91 96523 80295</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ToastNotifications({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="toast-container" 
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "380px",
        pointerEvents: "none"
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast-item animate-slide-in"
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderRadius: "12px",
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: toast.type === "success" 
              ? "1px solid rgba(16, 185, 129, 0.5)" 
              : toast.type === "error"
              ? "1px solid rgba(239, 68, 68, 0.5)"
              : "1px solid rgba(34, 211, 238, 0.5)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            color: "#f8fafc",
            fontSize: "13px",
            fontWeight: "500"
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={20} style={{ color: "#10b981", flexShrink: 0 }} />
          ) : toast.type === "error" ? (
            <ShieldAlert size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
          ) : (
            <Sparkles size={20} style={{ color: "#22d3ee", flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, lineHeight: "1.4" }}>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [datasets, setDatasets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminError, setAdminError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [userSummary, setUserSummary] = useState(null);
  const [dashTab, setDashTab] = useState("user");
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const [toasts, setToasts] = useState([]);

  function showToast(msg, type = "success") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const [pipelineModal, setPipelineModal] = useState({ show: false, title: "", message: "", type: "success" });
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("dq_theme") || "system";
    } catch (e) {
      return "system";
    }
  });

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      if (theme === "light") {
        root.classList.add("light-theme");
      } else if (theme === "dark") {
        root.classList.remove("light-theme");
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          root.classList.remove("light-theme");
        } else {
          root.classList.add("light-theme");
        }
      }
    };
    applyTheme();
    try {
      localStorage.setItem("dq_theme", theme);
    } catch (e) {}
  }, [theme]);

  // Wake up backend to bypass Render free tier cold-start
  useEffect(() => {
    if (!authenticated) {
      wakeUpBackend();
    }
  }, [authenticated]);

  const [pipelineProgress, setPipelineProgress] = useState({
    active: false,
    title: "",
    percent: 0,
    timeTaken: 0.0,
    status: "running",
  });

  const progressInterval = useRef(null);
  const startTimeRef = useRef(0);

  function startProgress(title, estimatedTimeMs = 3000) {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    startTimeRef.current = Date.now();
    setPipelineProgress({
      active: true,
      title,
      percent: 0,
      timeTaken: 0.0,
      status: "running",
    });

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const elapsedSec = (elapsed / 1000).toFixed(1);
      
      let calculatedPercent = Math.round((elapsed / estimatedTimeMs) * 90);
      if (calculatedPercent > 95) {
        calculatedPercent = 95 + Math.round((1 - Math.exp(-(elapsed - estimatedTimeMs) / 5000)) * 3);
      }
      if (calculatedPercent > 98) calculatedPercent = 98;

      setPipelineProgress(prev => {
        if (prev.status !== "running") return prev;
        return {
          ...prev,
          percent: calculatedPercent,
          timeTaken: parseFloat(elapsedSec),
        };
      });
    }, 100);
  }

  function finishProgressSuccess() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    const finalTime = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
    setPipelineProgress(prev => ({
      ...prev,
      percent: 100,
      timeTaken: parseFloat(finalTime),
      status: "success",
    }));

    setTimeout(() => {
      setPipelineProgress(prev => ({ ...prev, active: false }));
    }, 1200);
  }

  function finishProgressError(errorMsg) {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    const finalTime = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
    setPipelineProgress(prev => ({
      ...prev,
      title: `Error: ${errorMsg}`,
      percent: 0,
      timeTaken: parseFloat(finalTime),
      status: "error",
    }));

    setTimeout(() => {
      setPipelineProgress(prev => ({ ...prev, active: false }));
    }, 3000);
  }

  async function fetchDownloadHistory() {
    setLoading(true);
    try {
      const data = await getDownloadHistory();
      setDownloadHistory(data);
    } catch (err) {
      console.error("Could not fetch downloads:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAdminSummaryLazy() {
    setLoading(true);
    setAdminError("");
    try {
      const summary = await getAdminSummary();
      setAdminSummary(summary);
    } catch (err) {
      setAdminSummary(null);
      setAdminError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUserSummary() {
    if (!getToken()) return;
    try {
      const data = await getUserSummary();
      setUserSummary(data);
    } catch (err) {
      console.error("Could not fetch user summary:", err.message);
    }
  }

  async function refreshProfile() {
    if (!getToken()) return;
    try {
      const data = await getCurrentUser();
      setUserProfile(data);
    } catch (err) {
      console.error("Could not fetch profile:", err.message);
      clearToken();
      setAuthenticated(false);
    }
  }

  useEffect(() => {
    if (authenticated) {
      refreshProfile();
      refreshUserSummary();
    } else {
      setUserProfile(null);
      setUserSummary(null);
    }
  }, [authenticated]);

  async function handleProfileUpdate(payload) {
    const updated = await updateUserProfile(payload);
    setUserProfile(updated);
    await refreshDatasets(search);
  }

  async function handlePasswordChange(payload) {
    await changePassword(payload);
  }

  function handleLogout() {
    try {
      sessionStorage.setItem("dq_logged_out", "true");
    } catch (e) {
      window._dq_logged_out = true;
    }
    clearToken();
    setAuthenticated(false);
    setUserProfile(null);
    setUserSummary(null);
  }

  // Handle clicking outside the profile menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);





  async function refreshDatasets(searchVal = "") {
    if (!getToken()) return;
    setLoading(true);
    try {
      const data = await listDatasets(searchVal);
      setDatasets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle live search
  useEffect(() => {
    if (authenticated) {
      const delayDebounceFn = setTimeout(() => {
        refreshDatasets(search);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [search, authenticated]);

  useEffect(() => {
    if (authenticated) {
      refreshDatasets();
    }
  }, [authenticated]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await uploadDataset(file);
      setSelected(result);
      await refreshDatasets(search);
      await refreshUserSummary();
      await fetchDownloadHistory();
      setView("dataset_detail");
      setMessage("Dataset uploaded and quality scores generated.");
      showToast(`Dataset '${result?.dataset?.filename || file.name}' uploaded successfully!`, "success");
    } catch (err) {
      setMessage(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function handleImport(datasetDetails) {
    setLoading(true);
    setMessage("");
    try {
      const result = await importHubDataset(datasetDetails);
      setSelected(result);
      await refreshDatasets(search);
      await refreshUserSummary();
      await fetchDownloadHistory();
      setView("dataset_detail");
      setMessage("Dataset imported and quality scores generated.");
      showToast(`Dataset '${result?.filename || datasetDetails.name}' imported to library!`, "success");
    } catch (err) {
      setMessage(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function openDataset(id) {
    setLoading(true);
    setMessage("");
    try {
      const details = await getAnalysis(id);
      setSelected(details);
      setView("dataset_detail");
    } catch (err) {
      setMessage(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(dataset, format, version = "current") {
    setMessage("");
    try {
      showToast(`Preparing ${format.toUpperCase()} download for ${dataset.filename}...`, "info");
      await downloadDataset(dataset.id, format, dataset.filename, version);
      await refreshUserSummary();
      await fetchDownloadHistory();
      showToast(`Dataset '${dataset.filename}' downloaded as ${format.toUpperCase()}!`, "success");
    } catch (err) {
      setMessage(err.message);
      showToast(err.message, "error");
    }
  }

  async function handleDeleteHistory(logId) {
    try {
      await deleteDownloadHistoryLog(logId);
      await fetchDownloadHistory();
      await refreshUserSummary();
      showToast("Download history entry removed successfully!", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleClean(strategy) {
    if (!selected?.dataset?.id) return;
    setLoading(true);
    setMessage("");
    startProgress("Executing Data Cleaning...", 3000);
    try {
      const result = await cleanDataset(selected.dataset.id, strategy);
      setSelected(result);
      await refreshDatasets(search);
      await refreshUserSummary();
      finishProgressSuccess();
      setMessage("Data cleaning pipeline completed.");
      showToast(`Data cleaning completed using strategy '${strategy}'!`, "success");
      setPipelineModal({
        show: true,
        title: "Cleaning Completed",
        message: "Data cleaning pipeline executed successfully. Missing values have been imputed.",
        type: "success"
      });
    } catch (err) {
      finishProgressError(err.message);
      setMessage(err.message);
      showToast(err.message, "error");
      setPipelineModal({
        show: true,
        title: "Cleaning Failed",
        message: err.message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePreprocess(outlierMethod, scalingMethod, targetCol) {
    if (!selected?.dataset?.id) return;
    setLoading(true);
    setMessage("");
    startProgress("Executing Feature Preprocessing...", 4000);
    try {
      const result = await preprocessDataset(selected.dataset.id, outlierMethod, scalingMethod, targetCol);
      setSelected(result);
      await refreshDatasets(search);
      await refreshUserSummary();
      finishProgressSuccess();
      setMessage("Preprocessing and feature scaling completed.");
      showToast("Feature preprocessing & outlier treatment completed!", "success");
      setPipelineModal({
        show: true,
        title: "Preprocessing Completed",
        message: "Feature scaling and outliers handling pipeline completed successfully.",
        type: "success"
      });
    } catch (err) {
      finishProgressError(err.message);
      setMessage(err.message);
      showToast(err.message, "error");
      setPipelineModal({
        show: true,
        title: "Preprocessing Failed",
        message: err.message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTrain(targetCol, algorithm) {
    if (!selected?.dataset?.id) return;
    if (!targetCol) {
      setMessage("Target column is not defined. Please select a valid target column to train the model.");
      showToast("Please select a target column for model training.", "error");
      return;
    }
    setLoading(true);
    setMessage("");
    startProgress("Training Predictive ML Model...", 8000);
    try {
      const result = await trainDataset(selected.dataset.id, targetCol, algorithm);
      setSelected(result);
      await refreshDatasets(search);
      await refreshUserSummary();
      finishProgressSuccess();
      setMessage("Model training and validation completed.");
      showToast(`ML model trained targeting '${targetCol}'!`, "success");
      setPipelineModal({
        show: true,
        title: "Training Completed",
        message: `Machine learning model trained successfully targeting column '${targetCol}'.`,
        type: "success"
      });
    } catch (err) {
      finishProgressError(err.message);
      setMessage(err.message);
      showToast(err.message, "error");
      setPipelineModal({
        show: true,
        title: "Training Failed",
        message: err.message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  async function openAdminDashboard() {
    setView("admin");
    setLoading(true);
    setMessage("");
    setAdminError("");
    try {
      const summary = await getAdminSummary();
      setAdminSummary(summary);
    } catch (err) {
      setAdminSummary(null);
      setAdminError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return <AuthScreen onAuth={() => setAuthenticated(true)} />;
  }

  return (
    <main className="app-shell">
      {/* Success/Error Action Notification Modal */}
      {pipelineModal.show && (
        <div className="progress-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(9, 15, 28, 0.85)",
          backdropFilter: "blur(12px)",
          zIndex: 999999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <div className="card" style={{
            maxWidth: "420px",
            width: "90%",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-surface)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              {pipelineModal.type === "success" ? (
                <div style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "2px solid #10b981",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981"
                }}>
                  <ShieldCheck size={28} />
                </div>
              ) : (
                <div style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "2px solid #ef4444",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ef4444"
                }}>
                  <ShieldAlert size={28} />
                </div>
              )}
            </div>
            
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", color: "var(--text-primary)" }}>
              {pipelineModal.title}
            </h3>
            
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: "1.5" }}>
              {pipelineModal.message}
            </p>
            
            <button 
              className="btn-primary" 
              onClick={() => setPipelineModal({ ...pipelineModal, show: false })}
              style={{ width: "100%" }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Processing Progress Overlay */}
      {pipelineProgress.active && (
        <div className="progress-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(9, 15, 28, 0.8)",
          backdropFilter: "blur(12px)",
          zIndex: 99999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <div className="card progress-card" style={{
            maxWidth: "420px",
            width: "90%",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(20, 184, 166, 0.1)",
            border: "1px solid var(--border-color)",
            background: "radial-gradient(circle at top left, rgba(20, 184, 166, 0.05), transparent 60%), var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            transform: "translateY(0)",
            transition: "transform 0.3s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              {pipelineProgress.status === "running" ? (
                <div style={{
                  width: "56px",
                  height: "56px",
                  border: "3px solid rgba(6, 182, 212, 0.1)",
                  borderTopColor: "var(--color-cyan)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
              ) : pipelineProgress.status === "success" ? (
                <div style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "2px solid #10b981",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981"
                }}>
                  <CheckCircle2 size={28} />
                </div>
              ) : (
                <div style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "2px solid #ef4444",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ef4444"
                }}>
                  <ShieldAlert size={28} />
                </div>
              )}
            </div>

            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", color: "var(--text-main)", letterSpacing: "-0.5px" }}>
              {pipelineProgress.title}
            </h3>
            
            {pipelineProgress.status === "running" && (
              <>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", margin: "0 0 8px 0" }}>
                  Running pipeline computations. Please do not close this window.
                </p>
                <p style={{ fontSize: "15px", color: "var(--color-cyan)", fontWeight: "700", marginBottom: "16px" }}>
                  {pipelineProgress.percent}% Processed
                </p>
              </>
            )}
            {pipelineProgress.status === "success" && (
              <p style={{ fontSize: "13px", color: "#10b981", marginBottom: "24px", margin: "0 0 24px 0", fontWeight: "600" }}>
                Pipeline completed successfully!
              </p>
            )}
            {pipelineProgress.status === "error" && (
              <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "24px", margin: "0 0 24px 0", fontWeight: "600" }}>
                Execution failed.
              </p>
            )}

            {/* Glowing Progress bar */}
            <div style={{
              width: "100%",
              height: "8px",
              backgroundColor: "var(--bg-input)",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: "16px",
              border: "1px solid var(--border-color)",
              position: "relative",
            }}>
              <div style={{
                width: `${pipelineProgress.percent}%`,
                height: "100%",
                background: pipelineProgress.status === "error" 
                  ? "#ef4444" 
                  : pipelineProgress.status === "success" 
                    ? "#10b981" 
                    : "linear-gradient(90deg, var(--color-cyan), var(--color-secondary))",
                transition: "width 0.15s ease-out",
                borderRadius: "4px",
              }}></div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-secondary)" }}>
              <span>Progress: <strong style={{ color: "var(--text-main)" }}>{pipelineProgress.percent}%</strong></span>
              <span>Elapsed: <strong style={{ color: "var(--text-main)" }}>{pipelineProgress.timeTaken.toFixed(1)}s</strong></span>
            </div>
          </div>
        </div>
      )}

      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <div className="brand-logo">
              <ShieldCheck size={20} />
            </div>
            <span className="brand-name">Data Quality Hub</span>
          </div>

          <nav className="navbar-menu">
            <button
              className={view === "dashboard" ? "nav-link active" : "nav-link"}
              onClick={() => {
                setView("dashboard");
                setDashTab("user");
              }}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              className={view === "datasets" ? "nav-link active" : "nav-link"}
              onClick={() => setView("datasets")}
            >
              <Database size={16} />
              <span>Datasets</span>
            </button>
            
            <button
              className={view === "downloads" ? "nav-link active" : "nav-link"}
              onClick={() => {
                setView("downloads");
                fetchDownloadHistory();
              }}
            >
              <Download size={16} />
              <span>Downloads</span>
            </button>
          </nav>

          <div className="navbar-right" ref={profileMenuRef}>
            {userProfile ? (
              <div className="profile-menu-container">
                <button 
                  className={showProfileMenu ? "profile-avatar-btn active" : "profile-avatar-btn"} 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  title="View User Details"
                >
                  <User size={16} />
                </button>

                {showProfileMenu && (
                  <div className="profile-dropdown-menu">
                    <div className="profile-dropdown-header">
                      <div className="profile-avatar-large">
                        <User size={20} />
                      </div>
                      <div className="profile-meta-info">
                        <strong>{userProfile.name}</strong>
                        <span>{userProfile.email}</span>
                      </div>
                    </div>
                    
                    <div className="profile-dropdown-divider"></div>
                    
                    <div className="profile-dropdown-body">
                      <button 
                        className="profile-dropdown-item" 
                        onClick={() => {
                          setView("profile");
                          setShowProfileMenu(false);
                        }}
                      >
                        <User size={14} />
                        <span>Profile Settings</span>
                      </button>
                      
                      <div className="profile-dropdown-text-item">
                        <Calendar size={14} />
                        <span>Member since: <strong>{userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}</strong></span>
                      </div>
                    </div>
                    
                    <div className="profile-dropdown-divider"></div>
                    
                    <div className="profile-dropdown-footer">
                      <button
                        className="profile-dropdown-item logout-item"
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              authenticated && (
                <button 
                  className="btn-secondary btn-sm"
                  onClick={handleLogout}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <section className="content">
        <header className="topbar">
          <div className="topbar-title animate-slide-in">
            <span className="eyebrow-tag"><Sparkle size={10} /> Data Quality & ML Platform</span>
            <h1>
              {view === "datasets"
                ? "Available Datasets Catalog"
                : view === "downloads"
                  ? "My Downloads History"
                  : view === "profile"
                    ? "User Account Settings"
                    : view === "dashboard"
                      ? (userProfile?.role === "admin" && dashTab === "admin" ? "Admin Dashboard Console" : "Dashboard")
                      : "Pipeline & Data Exploration Workspace"}
            </h1>
          </div>
          {message && <div className="toast-notification animate-fade-in">{message}</div>}
        </header>

        <main className="main-viewport">
          {view === "dashboard" ? (
            <div className="dashboard-container animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {userProfile?.role === "admin" && (
                <div className="admin-tabs" style={{ marginBottom: "0px" }}>
                  <button
                    className={dashTab === "user" ? "active" : ""}
                    onClick={() => setDashTab("user")}
                  >
                    My Overview
                  </button>
                  <button
                    className={dashTab === "admin" ? "active" : ""}
                    onClick={() => {
                      setDashTab("admin");
                      fetchAdminSummaryLazy();
                    }}
                  >
                    Admin Console
                  </button>
                </div>
              )}

              {dashTab === "user" ? (
                <UserDashboard
                  summary={userSummary}
                  onOpenDataset={openDataset}
                  onNavigateToLibrary={() => setView("datasets")}
                  userProfile={userProfile}
                />
              ) : (
                <AdminDashboard
                  summary={adminSummary}
                  error={adminError}
                  userProfile={userProfile}
                  onReload={async () => {
                    try {
                      const summary = await getAdminSummary();
                      setAdminSummary(summary);
                    } catch (err) {}
                  }}
                />
              )}
            </div>
          ) : view === "datasets" ? (
            <DatasetLibrary
              datasets={datasets}
              search={search}
              setSearch={setSearch}
              onOpen={openDataset}
              onDownload={handleDownload}
              loading={loading}
              handleUpload={handleUpload}
              uploadLoading={loading}
              onImport={handleImport}
            />
          ) : view === "downloads" ? (
            <UserDownloadsView
              downloads={downloadHistory}
              onOpenDataset={openDataset}
              onDownload={handleDownload}
              onDeleteHistory={handleDeleteHistory}
              loading={loading}
              userProfile={userProfile}
            />
          ) : view === "profile" ? (
            <UserProfileView
              userProfile={userProfile}
              onProfileUpdate={handleProfileUpdate}
              onPasswordChange={handlePasswordChange}
              theme={theme}
              setTheme={setTheme}
              onLogout={handleLogout}
            />
          ) : view === "dataset_detail" ? (
            <Dashboard
              analysisResult={selected}
              onClean={handleClean}
              onPreprocess={handlePreprocess}
              onTrain={handleTrain}
              onDownload={handleDownload}
              datasets={datasets}
              onSwitchDataset={openDataset}
              onBackToLibrary={() => setView("datasets")}
            />
          ) : (
            <div className="card text-center py-4">Unknown view state</div>
          )}
        </main>
      </section>
      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
