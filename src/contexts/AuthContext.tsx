import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { client, clearStoredToken, getStoredToken, onUnauthorized, setAccessToken } from '@/api/client';
import { isAxiosError } from '@/lib/axios';

type AppRole = 'admin' | 'instructor' | 'teacher' | 'student';

interface ApiUser {
  id: string;
  email: string;
  name?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  roles?: AppRole[];
}

interface AuthContextType {
  user: ApiUser | null;
  token: string | null;
  roles: AppRole[];
  profile: { full_name: string | null; avatar_url: string | null } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (credential: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthResponse {
  access_token?: string;
  token?: string;
  user: ApiUser;
  roles?: AppRole[];
}

const extractProfile = (user: ApiUser | null) =>
  user
    ? {
        full_name: user.full_name ?? null,
        avatar_url: user.avatar_url ?? null,
      }
    : null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hasRole = (role: AppRole) => roles.includes(role);

  const applyAuthResponse = (data: AuthResponse) => {
    const nextToken = data.token ?? data.access_token;
    if (!nextToken) {
      throw new Error('Authentication response did not include a token.');
    }

    setAccessToken(nextToken);
    setTokenState(nextToken);
    setUser(data.user);
    setRoles(data.roles ?? data.user.roles ?? []);
  };

  const toError = (error: unknown, fallback: string) => {
    if (isAxiosError(error)) {
      const payload = error.response?.data as { message?: string; error?: string };
      const message = payload?.message || payload?.error;
      if (message) return new Error(message);
    }
    return error instanceof Error ? error : new Error(fallback);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data } = await client.post<AuthResponse>('/api/auth/register', {
        email,
        password,
        name: fullName,
      });
      applyAuthResponse(data);
      return { error: null };
    } catch (error) {
      return { error: toError(error, 'Registration failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await client.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });
      applyAuthResponse(data);
      return { error: null };
    } catch (error) {
      return { error: toError(error, 'Login failed') };
    }
  };

  const signInWithGoogle = async (credential: string, fullName?: string) => {
    try {
      const { data } = await client.post<AuthResponse>('/api/auth/google', {
        id_token: credential,
        name: fullName,
      });
      applyAuthResponse(data);
      return { error: null };
    } catch (error) {
      return { error: toError(error, 'Google sign-in failed') };
    }
  };

  const signOut = async () => {
    clearStoredToken();
    setAccessToken(null);
    setTokenState(null);
    setUser(null);
    setRoles([]);
  };

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      signOut();
    });

    const bootstrap = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      setAccessToken(storedToken);
      setTokenState(storedToken);

      try {
        const { data } = await client.get<AuthResponse>('/api/me');
        applyAuthResponse({ ...data, token: storedToken });
      } catch (error) {
        clearStoredToken();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
    return () => unsubscribe();
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      roles,
      profile: extractProfile(user),
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      hasRole,
    }),
    [user, token, roles, loading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { AppRole, ApiUser };
