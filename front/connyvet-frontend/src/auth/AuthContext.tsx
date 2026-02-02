// src/auth/AuthContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ---- Helpers para token global (axios + localStorage) ----
function setAuthTokenGlobal(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('connyvet_token', token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem('connyvet_token');
  }
}

function initAuthTokenFromStorage() {
  const token = localStorage.getItem('connyvet_token');
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}

// ==== TIPOS ====

export type UserRole = 'admin' | 'doctor' | 'asistente' | 'tutor';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}


interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  role: UserRole;
  active?: boolean;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (data: CreateUserPayload) => Promise<AuthUser>;
  register: (data: RegisterPayload) => Promise<AuthUser>;
}





const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ==== PROVIDER ====

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Wrapper para mantener sincronizado axios + localStorage + state
  const applyToken = useCallback((newToken: string | null) => {
    setAuthTokenGlobal(newToken);
    setToken(newToken);
  }, []);

  useEffect(() => {
    initAuthTokenFromStorage();

    const bootstrap = async () => {
      const stored = localStorage.getItem('connyvet_token');
      if (stored) {
        setToken(stored);
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data as AuthUser);
      } catch {
        setUser(null);
        applyToken(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [applyToken]);

const login = useCallback(
  async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });

      const { token: newToken, user: loggedUser } = res.data;

      applyToken(newToken);
      setUser(loggedUser as AuthUser);
    } catch (error: any) {
      console.error('Login error response:', error?.response?.data);
      // Propagamos el error “limpio” al componente
      throw error?.response?.data ?? error;
    }
  },
  [applyToken]
);


  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // nos da lo mismo si falla
    } finally {
      applyToken(null);
      setUser(null);
    }
  }, [applyToken]);

  const createUser = useCallback(async (payload: CreateUserPayload) => {
    const res = await api.post('/admin/users', payload);
    return res.data.user as AuthUser;
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await api.post('/auth/register', payload);
      return res.data.user as AuthUser;
    },
    []
  );

const value: AuthContextValue = {
  user,
  loading,
  token,
  login,
  logout,
  createUser,
  register,
};

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ==== HOOK ====

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
