import axios, { AxiosInstanceType, AxiosRequestConfig, AxiosResponse, isAxiosError } from "@/lib/axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const TOKEN_STORAGE_KEY = "access_token";

let accessToken: string | null = null;
let apiClient: AxiosInstanceType | null = null;
let unauthorizedHandlers: Array<() => void> = [];

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const clearStoredToken = () => {
  accessToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandlers.push(handler);
  return () => {
    unauthorizedHandlers = unauthorizedHandlers.filter((h) => h !== handler);
  };
};

const ensureClient = () => {
  if (apiClient) return apiClient;

  apiClient = axios.create({
    baseURL: API_BASE_URL,
  });

  apiClient.interceptors.request.use((config: AxiosRequestConfig) => {
    if (!config.headers) config.headers = {};
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        clearStoredToken();
        unauthorizedHandlers.forEach((handler) => handler());
      }
      throw error;
    }
  );

  return apiClient;
};

export const client = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) => ensureClient().get<T>(url, config),
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    ensureClient().post<T>(url, data, config),
  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    ensureClient().put<T>(url, data, config),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    ensureClient().delete<T>(url, config),
};

export type ApiClient = typeof client;
