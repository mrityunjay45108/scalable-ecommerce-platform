'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserDto, Role } from '@ecommerce/types';
import { apiClient } from './api-client';
import { signInWithGooglePopup, signOutFirebase } from './firebase';

interface AuthContextType {
  user: UserDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<UserDto>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<UserDto>;
  signInWithGoogle: () => Promise<UserDto>;
  logout: () => Promise<void>;
  updateUser: (user: UserDto) => void;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string }>;
  verifyEmail: (token: string) => Promise<{ message: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const profile = await apiClient.get<UserDto>('/auth/me');
      setUser(profile);
      localStorage.setItem('current_user', JSON.stringify(profile));
    } catch {
      setUser(null);
      localStorage.removeItem('current_user');
      localStorage.removeItem('access_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('current_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore parse error
      }
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<UserDto> => {
    const res = await apiClient.post<{ user: UserDto; accessToken: string }>('/auth/login', {
      email,
      password,
    });
    const { user: userData, accessToken } = res;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('current_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<UserDto> => {
    const res = await apiClient.post<{ user: UserDto; accessToken: string }>('/auth/register', data);
    const { user: userData, accessToken } = res;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('current_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  // Firebase Google OAuth Sign In
  const signInWithGoogle = async (): Promise<UserDto> => {
    const fbUser = await signInWithGooglePopup();
    const idToken = await fbUser.getIdToken();

    const displayName = fbUser.displayName || '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Customer';

    const res = await apiClient.post<{ user: UserDto; accessToken: string }>('/auth/firebase-login', {
      idToken,
      email: fbUser.email,
      firstName,
      lastName,
      avatarUrl: fbUser.photoURL || undefined,
    });

    const { user: userData, accessToken } = res;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('current_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
      await signOutFirebase().catch(() => {});
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('current_user');
      setUser(null);
    }
  };

  const updateUser = (updatedUser: UserDto) => {
    setUser(updatedUser);
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
  };

  const forgotPassword = async (email: string) => {
    return apiClient.post<{ message: string }>('/auth/forgot-password', { email });
  };

  const resetPassword = async (token: string, newPassword: string) => {
    return apiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword });
  };

  const verifyEmail = async (token: string) => {
    return apiClient.post<{ message: string }>('/auth/verify-email', { token });
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    return apiClient.patch<{ message: string }>('/auth/change-password', { oldPassword, newPassword });
  };

  const isAdmin = user?.role === Role.ADMIN;
  const isStaff = user?.role === Role.ADMIN || user?.role === Role.STAFF;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isStaff,
        login,
        register,
        signInWithGoogle,
        logout,
        updateUser,
        forgotPassword,
        resetPassword,
        verifyEmail,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
