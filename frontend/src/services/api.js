import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000/api"
});

API.interceptors.request.use(req => {
  const token = localStorage.getItem("token");
  if (token) {
    if (req.headers && typeof req.headers.set === 'function') {
      req.headers.set('Authorization', token);
    } else {
      req.headers.Authorization = token;
    }
  }
  return req;
});

// Add response interceptor to handle expired/invalid tokens
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;