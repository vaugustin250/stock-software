import axios from 'axios';
import { io as socketIo } from 'socket.io-client';

// ---------------------------------------------------------------------------
// API base URL — set VITE_API_URL in client/.env (or .env.production, etc.)
// Falls back to localhost:3000 for local dev only
// ---------------------------------------------------------------------------
export const API_BASE = import.meta.env.VITE_API_URL as string || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Shared Axios instance
// ---------------------------------------------------------------------------
export const api = axios.create({
  baseURL: API_BASE,
});

// Attach JWT token to every outgoing request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 in one place — clear storage and redirect to /login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---------------------------------------------------------------------------
// Socket.IO helper — uses the same base URL so it works in any environment
// ---------------------------------------------------------------------------
export const createSocket = () => socketIo(API_BASE);
