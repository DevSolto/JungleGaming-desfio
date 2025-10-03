import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

const shouldBypassRefreshRetry = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout')
  );
};

const requestAccessTokenRefresh = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = api
      .post<{ accessToken: string }>('/auth/refresh')
      .then((response) => {
        const token = response.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();

  if (token) {
    config.headers.setAuthorization(`Bearer ${token}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;

    if (!config) {
      return Promise.reject(error);
    }

    const originalRequest = config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = response?.status ?? 0;
    const requestUrl = originalRequest.url ?? '';

    if (
      status === 401 &&
      !originalRequest._retry &&
      !requestUrl.includes('/auth/refresh') &&
      !shouldBypassRefreshRetry(requestUrl)
    ) {
      originalRequest._retry = true;

      try {
        const token = await requestAccessTokenRefresh();
        originalRequest.headers.setAuthorization(`Bearer ${token}`);
        return api(originalRequest as AxiosRequestConfig);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export { api };
