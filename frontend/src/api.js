const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

export function getToken() {
  try {
    return localStorage.getItem("dq_token");
  } catch (e) {
    return window._dq_token || null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem("dq_token", token);
  } catch (e) {
    window._dq_token = token;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem("dq_token");
  } catch (e) {
    window._dq_token = null;
  }
}

async function request(path, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || 120000);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Backend is taking too long. Restart the backend and try a smaller CSV file.");
    }
    throw new Error("Could not connect to backend. Check that FastAPI is running on port 8010.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return response.json();
}

export function registerUser(payload) {
  return request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return request("/api/auth/me");
}

export function updateUserProfile(payload) {
  return request("/api/auth/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload) {
  return request("/api/auth/me/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function requestOTP(email, action) {
  return request("/api/auth/forgot-password/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, action }),
  });
}

export function verifyOTPLogin(email, otp) {
  return request("/api/auth/forgot-password/verify-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
}

export function verifyOTPReset(email, otp, newPassword) {
  return request("/api/auth/forgot-password/verify-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });
}

export function listDatasets(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return request(`/api/datasets${query}`);
}

export function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/datasets/upload", {
    method: "POST",
    body: formData,
  });
}

export function getAnalysis(id) {
  return request(`/api/datasets/${id}/analysis`);
}

export function getUserSummary() {
  return request("/api/datasets/summary/user");
}

export function getDownloadHistory() {
  return request("/api/datasets/downloads/history");
}

export function cleanDataset(id, imputationStrategy = "median") {
  return request(`/api/datasets/${id}/clean?imputation_strategy=${imputationStrategy}`, {
    method: "POST",
  });
}

export function preprocessDataset(id, outlierMethod = "iqr", scalingMethod = "standard", targetColumn = "") {
  const params = [`outlier_method=${outlierMethod}`, `scaling_method=${scalingMethod}`];
  if (targetColumn) params.push(`target_column=${encodeURIComponent(targetColumn)}`);
  return request(`/api/datasets/${id}/preprocess?${params.join("&")}`, {
    method: "POST",
    timeout: 180000,
  });
}

export function trainDataset(id, targetColumn = "", algorithm = "auto") {
  const params = [];
  if (targetColumn) params.push(`target_column=${encodeURIComponent(targetColumn)}`);
  if (algorithm) params.push(`algorithm=${encodeURIComponent(algorithm)}`);
  const query = params.length ? `?${params.join("&")}` : "";

  return request(`/api/datasets/${id}/train${query}`, {
    method: "POST",
    timeout: 180000,
  });
}

export function getAdminSummary() {
  return request("/api/admin/summary");
}

export function listUsers() {
  return request("/api/admin/users");
}

export function updateUserRole(userId, role) {
  return request(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export function deleteUser(userId) {
  return request(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export function deleteDatasetAdmin(datasetId) {
  return request(`/api/admin/datasets/${datasetId}`, {
    method: "DELETE",
  });
}

export async function downloadDataset(id, format, filename = "dataset", version = "current") {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/datasets/${id}/export?format=${format}&version=${version}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Download failed" }));
    throw new Error(error.detail || "Download failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `export_${filename.replace(/\.[^/.]+$/, "")}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}



