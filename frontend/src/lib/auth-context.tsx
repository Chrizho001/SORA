"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { User, authApi } from "./auth-api";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (access: string, user: User) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Access token is held in-memory ONLY as required by architecture/01-authentication.md
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = useCallback((access: string, userData: User) => {
    setAccessToken(access);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Logout endpoint error:", err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  /**
   * Refresh session silently via HttpOnly cookie
   * Called on initial page mount and whenever access token expires
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { access } = await authApi.refreshToken();
      setAccessToken(access);
      // Fetch user profile with the newly minted access token
      const profile = await authApi.getMe(access);
      setUser(profile);
      return true;
    } catch {
      setAccessToken(null);
      setUser(null);
      return false;
    }
  }, []);

  // Try silent refresh on initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await refreshSession();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        refreshSession,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
