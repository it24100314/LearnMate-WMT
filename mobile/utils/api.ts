import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from './storage';

// On web (browser), use localhost since the browser can reach it directly.
// On native (Android/iOS), use the env variable which must be set to the machine's LAN IP.
export const API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:5000/api'
    : process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

api.interceptors.request.use(
  async (config) => {
    // storage.getItem is SSR-safe — returns null on server side
    const token = await storage.getItem('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // For FormData, let axios set the Content-Type with proper boundary
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
