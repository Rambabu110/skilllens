import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

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
      // Clear invalid token
      localStorage.removeItem("skilllens_token");
      // Dispatch a custom event so the UI can show the auth modal
      // instead of doing a hard redirect to /login (which would break the public UX)
      window.dispatchEvent(new CustomEvent("skilllens:auth-required"));
    }
    return Promise.reject(error);
  }
);

export default client;
