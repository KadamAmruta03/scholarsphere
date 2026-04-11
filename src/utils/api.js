import axios from "axios";

function getDefaultBaseUrl() {
  // CRA env vars are baked at build/start time. For LAN testing (phone on WiFi),
  // fall back to using the current hostname so we don't accidentally hit "localhost"
  // on the phone.
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:5000`;
    }
  }
  return "http://localhost:5000";
}

function getFullApiUrl() {
  const rawUrl = process.env.REACT_APP_API_BASE_URL || getDefaultBaseUrl();
  if (!rawUrl) return "";
  
  // If it's a domain name without a protocol (e.g. "my-api.railway.app"), add https://
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  
  // Remove any trailing slashes to avoid double-slash issues (e.g. /api/login becomes //api/login)
  return url.replace(/\/+$/, "");
}

export const API_BASE_URL = getFullApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined" && window.location?.pathname !== "/auth") {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
