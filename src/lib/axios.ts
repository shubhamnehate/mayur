export interface AxiosRequestConfig {
  baseURL?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
}

export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

type FulfilledFn<T> = (value: T) => T | Promise<T>;
type RejectedFn = (error: unknown) => unknown;

interface Interceptor<T> {
  fulfilled: FulfilledFn<T>;
  rejected?: RejectedFn;
}

class InterceptorManager<T> {
  private handlers: Array<Interceptor<T> | null> = [];

  use(fulfilled: FulfilledFn<T>, rejected?: RejectedFn) {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  eject(id: number) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  forEach(fn: (interceptor: Interceptor<T>) => void) {
    this.handlers.forEach((handler) => {
      if (handler !== null) {
        fn(handler);
      }
    });
  }
}

export class AxiosError<T = unknown> extends Error {
  constructor(
    message: string,
    public config: AxiosRequestConfig,
    public response?: AxiosResponse<T>
  ) {
    super(message);
    this.name = 'AxiosError';
  }
}

const serializeParams = (params?: Record<string, string | number | boolean>) => {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const normalizeHeaders = (headers?: Record<string, string>) => {
  if (!headers) return {} as Record<string, string>;
  return Object.keys(headers).reduce((acc, key) => {
    acc[key] = headers[key];
    return acc;
  }, {} as Record<string, string>);
};

class AxiosInstance {
  defaults: AxiosRequestConfig;
  interceptors = {
    request: new InterceptorManager<AxiosRequestConfig>(),
    response: new InterceptorManager<AxiosResponse>(),
  };

  constructor(config: AxiosRequestConfig = {}) {
    this.defaults = config;
  }

  private async dispatchRequest<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const method = (config.method || 'GET').toUpperCase();
    const url = `${config.baseURL || ''}${config.url || ''}${serializeParams(config.params)}`;

    const headers = normalizeHeaders({ ...(this.defaults.headers || {}), ...(config.headers || {}) });
    const init: RequestInit = {
      method,
      headers,
    };

    if (config.data !== undefined && method !== 'GET') {
      if (typeof config.data === 'string') {
        init.body = config.data;
      } else {
        init.body = JSON.stringify(config.data);
        if (!init.headers) init.headers = {};
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const response = await fetch(url, init);
    let responseData: unknown = null;
    const text = await response.text();

    try {
      responseData = text ? JSON.parse(text) : null;
    } catch {
      responseData = text;
    }

    const axiosResponse: AxiosResponse<T> = {
      data: responseData as T,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
    };

    if (!response.ok) {
      throw new AxiosError<T>(`Request failed with status code ${response.status}`, config, axiosResponse);
    }

    return axiosResponse;
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const mergedConfig: AxiosRequestConfig = {
      ...this.defaults,
      ...config,
      headers: { ...(this.defaults.headers || {}), ...(config.headers || {}) },
    };

    const requestHandlers: Interceptor<AxiosRequestConfig>[] = [];
    this.interceptors.request.forEach((handler) => requestHandlers.unshift(handler));

    const responseHandlers: Interceptor<AxiosResponse>[] = [];
    this.interceptors.response.forEach((handler) => responseHandlers.push(handler));

    let promise: Promise<any> = Promise.resolve(mergedConfig);

    requestHandlers.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled, rejected as RejectedFn);
    });

    promise = promise.then((finalConfig) => this.dispatchRequest<T>(finalConfig));

    responseHandlers.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled as FulfilledFn<any>, rejected as RejectedFn);
    });

    return promise as Promise<AxiosResponse<T>>;
  }

  get<T = unknown>(url: string, config: AxiosRequestConfig = {}) {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  post<T = unknown>(url: string, data?: unknown, config: AxiosRequestConfig = {}) {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }
}

const axios = {
  create(config: AxiosRequestConfig = {}) {
    return new AxiosInstance(config);
  },
};

export type AxiosInstanceType = ReturnType<typeof axios.create>;
export { InterceptorManager };
export default axios;

export const isAxiosError = (error: unknown): error is AxiosError => error instanceof AxiosError;
