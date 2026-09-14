import axios from "axios";

// When accessed from a mobile device or other computer on local network (e.g., http://192.168.1.5:5173),
// dynamically route API requests to that host IP rather than failing against the phone's localhost.
const getApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase && !envBase.includes("localhost") && !envBase.includes("127.0.0.1")) {
    return envBase;
  }
  if (
    typeof window !== "undefined" &&
    window.location.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return `http://${window.location.hostname}:8000`;
  }
  return envBase || "http://localhost:8000";
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
