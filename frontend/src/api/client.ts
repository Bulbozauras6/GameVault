
import axios from "axios";

const localApiHost = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
    || (import.meta.env.DEV ? `http://${localApiHost}:8000` : undefined);

if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL must be configured for production.");
}

const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

export default api;
