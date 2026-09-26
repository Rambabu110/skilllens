import axios from "axios";

// In development (Vite dev server has proxy configured in vite.config.js),
// return "" (empty string) so all API requests go to the current host/port (e.g. :5173).
// Vite's proxy then securely forwards them to http://127.0.0.1:8000.
// This guarantees mobile devices on local WiFi (e.g. 192.168.x.x:5173) can reach the backend
// without needing port 8000 unblocked on Windows Firewall or bound to 0.0.0.0.
const getApiBase = () => {
  let envBase = import.meta.env.VITE_API_BASE;
  if (envBase) {
    envBase = envBase.trim().replace(/\/+$/, "");
  }
  // If explicitly configured to an external cloud API (e.g., Render, Railway, Vercel), use it
  if (envBase && !envBase.includes("localhost") && !envBase.includes("127.0.0.1")) {
    return envBase;
  }
  // In development mode, use relative URLs ("") so Vite proxy forwards to backend
  if (import.meta.env.DEV) {
    return "";
  }
  return envBase || "";
};

const API_BASE = getApiBase();

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("skilllens_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid/expired token quietly so user remains guest without intrusive popup
      localStorage.removeItem("skilllens_token");
    }
    return Promise.reject(error);
  }
);

export default client;
