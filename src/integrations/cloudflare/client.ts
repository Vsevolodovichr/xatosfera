// Cloudflare API Client
// Replaces Supabase client with Cloudflare Workers API

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Token storage
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Load tokens from localStorage on init
if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem('access_token');
  refreshToken = localStorage.getItem('refresh_token');
}

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'superuser' | 'top_manager' | 'manager';
  phone?: string;
  avatar_url?: string;
  approved: number;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// Auth state listeners
type AuthChangeHandler = () => void;
const listeners = new Set<AuthChangeHandler>();
let currentUser: User | null = null;

const notify = () => {
  listeners.forEach((handler) => handler());
};

// Helper for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && refreshToken) {
      // Try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry request with new token
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
        
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error((errorData as any).error || `HTTP ${retryResponse.status}`);
        }
        
        return { data: await retryResponse.json() as T, error: null };
      } else {
        // Refresh failed, clear auth
        clearAuth();
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).error || `HTTP ${response.status}`);
    }

    const data = await response.json() as T;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Refresh access token
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json() as AuthResponse;
    setTokens(data.access_token, data.refresh_token);
    currentUser = data.user;
    notify();
    return true;
  } catch {
    return false;
  }
}

// Set tokens
function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

// Clear auth
function clearAuth() {
  accessToken = null;
  refreshToken = null;
  currentUser = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  notify();
}

// Initialize - check if we have valid session
async function initAuth() {
  if (accessToken) {
    const { data, error } = await apiRequest<User>('/api/auth/me');
    if (data && !error) {
      currentUser = data;
      notify();
    } else {
      // Try refresh
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearAuth();
      }
    }
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  initAuth();
}

// Auth methods
const auth = {
  async signUp(email: string, password: string, fullName: string): Promise<{ data: AuthResponse | null; error: Error | null }> {
    const { data, error } = await apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (data && !error) {
      setTokens(data.access_token, data.refresh_token);
      currentUser = data.user;
      notify();
    }

    return { data, error };
  },

  async signInWithPassword(credentials: { email: string; password: string }): Promise<{ data: AuthResponse | null; error: Error | null }> {
    const { data, error } = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (data && !error) {
      setTokens(data.access_token, data.refresh_token);
      currentUser = data.user;
      notify();
    }

    return { data, error };
  },

  async signOut(): Promise<void> {
    if (refreshToken) {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
    clearAuth();
  },

  async getSession(): Promise<{ data: { session: { user: User } | null } }> {
    if (!accessToken) {
      return { data: { session: null } };
    }

    const { data, error } = await apiRequest<User>('/api/auth/me');
    if (data && !error) {
      currentUser = data;
      return { data: { session: { user: data } } };
    }

    return { data: { session: null } };
  },

  onAuthStateChange(callback: (event: string, session: { user: User } | null) => void) {
    const handler = () => {
      callback(currentUser ? 'SIGNED_IN' : 'SIGNED_OUT', currentUser ? { user: currentUser } : null);
    };
    listeners.add(handler);
    return { data: { subscription: { unsubscribe: () => listeners.delete(handler) } } };
  },
};

// Query builder for database operations
type QueryOptions = {
  select?: string;
  order?: { column: string; ascending?: boolean };
  eq?: { column: string; value: unknown };
  single?: boolean;
};

function createQueryBuilder(tableName: string) {
  let options: QueryOptions = {};
  let pendingData: Record<string, unknown> | null = null;
  let pendingId: string | null = null;
  let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';

  const builder = {
    select(columns?: string) {
      options.select = columns;
      method = 'GET';
      return builder;
    },

    insert(data: Record<string, unknown>) {
      pendingData = data;
      method = 'POST';
      return builder;
    },

    update(data: Record<string, unknown>) {
      pendingData = data;
      method = 'PUT';
      return builder;
    },

    delete() {
      method = 'DELETE';
      return builder;
    },

    eq(column: string, value: unknown) {
      if (column === 'id') {
        pendingId = value as string;
      }
      options.eq = { column, value };
      return builder;
    },

    order(column: string, opts?: { ascending?: boolean }) {
      options.order = { column, ascending: opts?.ascending ?? true };
      return builder;
    },

    single() {
      options.single = true;
      return builder;
    },

    async then<T>(resolve: (value: { data: T | null; error: Error | null }) => void) {
      let endpoint = `/api/${tableName}`;
      
      if (pendingId && (method === 'GET' || method === 'PUT' || method === 'DELETE')) {
        endpoint = `/api/${tableName}/${pendingId}`;
      }

      // Add query params for GET
      if (method === 'GET') {
        const params = new URLSearchParams();
        if (options.order) {
          params.set('sort', options.order.ascending ? options.order.column : `-${options.order.column}`);
        }
        if (options.eq && options.eq.column !== 'id') {
          params.set(options.eq.column, String(options.eq.value));
        }
        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }
      }

      const requestOptions: RequestInit = { method };
      if (pendingData && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(pendingData);
      }

      const result = await apiRequest<T>(endpoint, requestOptions);
      resolve(result);
    },
  };

  return builder;
}

// Storage operations for R2
const storage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: File | Blob) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', bucket);

        try {
          const response = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { data: null, error: new Error((errorData as any).error || 'Upload failed') };
          }

          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      async remove(paths: string[]) {
        // For R2, we delete through the documents API
        // This is a simplified version - in production you'd want a dedicated endpoint
        return { data: null, error: null };
      },

      async createSignedUrl(path: string, expiresIn: number) {
        // R2 files are accessed through the Worker proxy
        return { 
          data: { signedUrl: `${API_URL}/api/files/${encodeURIComponent(path)}` }, 
          error: null 
        };
      },

      getPublicUrl(path: string) {
        return { data: { publicUrl: `${API_URL}/api/files/${encodeURIComponent(path)}` } };
      },
    };
  },
};

// Normalize record to match expected format
function normalizeRecord(record: Record<string, any> | null): Record<string, any> {
  if (!record) return {};
  return {
    ...record,
    created: record.created_at,
    updated: record.updated_at,
  };
}

// Main client object - compatible with existing code
export const cloudflareApi = {
  // Database operations
  from(tableName: string) {
    return createQueryBuilder(tableName);
  },

  // Collection-style API (for backward compatibility)
  collection(name: string) {
    return {
      async getOne(id: string, options?: { fields?: string }) {
        const { data, error } = await apiRequest<any>(`/api/${name}/${id}`);
        if (error) throw error;
        return normalizeRecord(data);
      },

      async getFullList(options?: { sort?: string; fields?: string }) {
        let endpoint = `/api/${name}`;
        if (options?.sort) {
          const isDesc = options.sort.startsWith('-');
          const column = options.sort.replace(/^-/, '');
          endpoint += `?sort=${isDesc ? '-' : ''}${column}`;
        }
        const { data, error } = await apiRequest<any[]>(endpoint);
        if (error) throw error;
        return (data ?? []).map(normalizeRecord);
      },

      async create(payload: Record<string, unknown>) {
        // Handle user creation specially
        if (name === 'users' && payload.email && payload.password) {
          const { data, error } = await apiRequest<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email: payload.email,
              password: payload.password,
              full_name: payload.full_name,
            }),
          });
          if (error) throw error;
          return {
            id: data?.user.id,
            email: data?.user.email,
            full_name: data?.user.full_name,
          };
        }

        const { data, error } = await apiRequest<any>(`/api/${name}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (error) throw error;
        return normalizeRecord(data);
      },

      async update(id: string, payload: Record<string, unknown>) {
        const { data, error } = await apiRequest<any>(`/api/${name}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (error) throw error;
        return normalizeRecord(data);
      },

      async delete(id: string) {
        const { error } = await apiRequest(`/api/${name}/${id}`, { method: 'DELETE' });
        if (error) throw error;
      },

      async authWithPassword(email: string, password: string) {
        const { data, error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      },
    };
  },

  // Auth store (for backward compatibility)
  authStore: {
    get model() {
      return currentUser;
    },

    get isValid() {
      return Boolean(accessToken);
    },

    onChange(handler: AuthChangeHandler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },

    clear() {
      clearAuth();
    },
  },

  // Auth methods
  auth,

  // Storage
  storage,

  // Files helper
  files: {
    getUrl(record: Record<string, unknown>, fileName?: string) {
      if (!fileName) return '';
      return `${API_URL}/api/files/${encodeURIComponent(fileName as string)}`;
    },
  },
};

export default cloudflareApi;
