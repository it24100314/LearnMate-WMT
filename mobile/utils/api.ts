import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Prefer the environment-provided URL, but fall back to a sensible default
// during development so the app doesn't immediately fail when env isn't loaded.
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // For FormData, let axios set the Content-Type with proper boundary
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
