
import axios from "axios";

const localApiHost = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
const localApiOrigin = `http://${localApiHost}:8000`;
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiBaseUrl = configuredApiBaseUrl
    || (import.meta.env.DEV ? `${localApiOrigin}/api` : "/api");

if (import.meta.env.PROD && (!apiBaseUrl.startsWith("/") || apiBaseUrl.startsWith("//"))) {
    throw new Error("VITE_API_BASE_URL must be a same-origin path in production.");
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

export async function initializeCsrfCookie(): Promise<void> {
    await api.get("/sanctum/csrf-cookie", {
        baseURL: import.meta.env.DEV ? localApiOrigin : "",
    });
}

export default api;
