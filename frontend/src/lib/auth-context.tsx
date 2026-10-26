"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { User, authApi } from "./auth-api";
import { registerSessionExpiredHandler } from "./axios-client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (access: string, user: User) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Module-level initialRefresh promise reused across mounts under React Strict Mode
let initialRefresh: Promise<{ user: User | null; access: string | null }> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const queryClient = useQueryClient();
  const router = useRouter();

  // Register session expired handler to reset state and redirect to /login?expired=1
  useEffect(() => {
    registerSessionExpiredHandler(() => {
      setUser(null);
      queryClient.clear();
      initialRefresh = null;
      router.replace("/login?expired=1");
    });
    return () => {
      registerSessionExpiredHandler(null);
    };
  }, [queryClient, router]);

  const login = useCallback((access: string, userData: User) => {
    setUser(userData);
    setIsLoggingOut(false);
    initialRefresh = Promise.resolve({ user: userData, access });
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Logout endpoint error:", err);
    } finally {
      setUser(null);
      queryClient.clear();
      initialRefresh = null;
    }
  }, [queryClient]);

  /**
   * Refresh session silently via HttpOnly cookie
   * Called on initial page mount and whenever access token expires
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { access } = await authApi.refreshToken();
      // Fetch user profile with the newly minted access token
      const profile = await authApi.getMe(access);
      setUser(profile);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  // Try silent refresh on initial load, idempotent under React Strict Mode
  useEffect(() => {
    let isMounted = true;

    if (!initialRefresh) {
      initialRefresh = (async () => {
        try {
          const { access } = await authApi.refreshToken();
          const profile = await authApi.getMe(access);
          return { user: profile, access };
        } catch {
          return { user: null, access: null };
        }
      })();
    }

    initialRefresh
      .then((res) => {
        if (isMounted) {
          setUser(res.user);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggingOut,
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
