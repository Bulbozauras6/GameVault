
import axios from "axios";

const apiHost = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";

const api = axios.create({
    baseURL: `http://${apiHost}:8000`,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

export default api;
