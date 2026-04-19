import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Storage from './storage';

const withApiSuffix = (baseUrl: string) => (
  baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`
);

const toHostFromUrlLike = (value: string | null | undefined): string | null => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value
    .replace(/^exp:\/\//, '')
    .replace(/^http:\/\//, '')
    .replace(/^https:\/\//, '');
  const host = cleaned.split('/')[0]?.split(':')[0];
  return host || null;
};

const getExpoLanBaseUrl = (): string | null => {
  const constantsAny = Constants as any;
  const candidateHosts = [
    toHostFromUrlLike(Constants.expoConfig?.hostUri),
    toHostFromUrlLike(constantsAny?.expoGoConfig?.debuggerHost),
    toHostFromUrlLike(constantsAny?.manifest2?.extra?.expoGo?.debuggerHost),
    toHostFromUrlLike(constantsAny?.manifest?.debuggerHost),
    toHostFromUrlLike(Constants.linkingUri),
  ].filter(Boolean) as string[];

  const host = candidateHosts[0];
  return host ? `http://${host}:5000` : null;
};

const getDefaultApiBaseUrls = (): string[] => {
  const urls: string[] = [];

  const expoLanUrl = getExpoLanBaseUrl();
  if (expoLanUrl) {
    urls.push(expoLanUrl);
  }

  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:5000');
    urls.push('http://127.0.0.1:5000');
  } else {
    urls.push('http://127.0.0.1:5000');
  }

  urls.push('http://localhost:5000');
  return [...new Set(urls)];
};

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const configuredBaseUrl = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : null;
const API_BASE_CANDIDATES = [
  ...(configuredBaseUrl ? [configuredBaseUrl] : []),
  ...getDefaultApiBaseUrls(),
].filter(Boolean);
const uniqueBaseCandidates = [...new Set(API_BASE_CANDIDATES)];

let activeBaseUrl = uniqueBaseCandidates[0] || 'http://127.0.0.1:5000';
export const API_URL = withApiSuffix(activeBaseUrl);
export const getActiveApiUrl = () => withApiSuffix(activeBaseUrl);

if (Platform.OS === 'web' && API_URL.includes('localhost')) {
  console.warn(
    `API base URL is ${API_URL}. If your backend is not running on this machine, set EXPO_PUBLIC_API_URL.`
  );
}

const api = axios.create({
  baseURL: withApiSuffix(activeBaseUrl),
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await Storage.getItemAsync('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as any;
    const isNetworkError = !error?.response;
    const alreadyRetried = Boolean(config?._baseUrlRetried);

    if (isNetworkError && config && !alreadyRetried && uniqueBaseCandidates.length > 1) {
      const currentBaseFromConfig = (config.baseURL || api.defaults.baseURL || '').replace(/\/api\/?$/, '');
      const fallbackBase = uniqueBaseCandidates.find((base) => base !== currentBaseFromConfig);

      if (fallbackBase) {
        try {
          const retryResponse = await api.request({
            ...config,
            _baseUrlRetried: true,
            baseURL: withApiSuffix(fallbackBase),
          });

          activeBaseUrl = fallbackBase;
          api.defaults.baseURL = withApiSuffix(fallbackBase);
          return retryResponse;
        } catch {
          // Continue to reject original error below.
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
