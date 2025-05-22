import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';
import { navigationRef } from '../navigation/navigationRef';

// Define types
type User = {
  id: string;
  email: string;
  username: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  isUserLoggedIn: () => boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from storage on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem('token');

      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${storedToken}`;

        try {
          const response = await axios.get<User>(`${API_URL}/auth/profile`);
          const freshUser = response.data;
          setUser(freshUser);
          await AsyncStorage.setItem('user', JSON.stringify(freshUser));

          if (navigationRef.isReady()) {
            navigationRef.navigate('Main' as never);
          }
        } catch (profileError: any) {
          console.error(
            'Lỗi khi tải thông tin hồ sơ người dùng:',
            profileError.response?.data || profileError.message,
          );
          setToken(null);
          setUser(null);
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
          if (navigationRef.isReady()) {
            navigationRef.navigate('Auth' as never);
          }
        }
      } else {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          setToken(localToken);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải thông tin đăng nhập đã lưu:', error);
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const isUserLoggedIn = () => {
    console.log(token);
    return token !== null;
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      // Save to state
      setToken(token);
      setUser(user);

      // Save to storage
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // Set axios auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Đăng nhập thất bại';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (
    email: string,
    password: string,
    username: string,
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        username,
      });

      const { token, user } = response.data;

      // Save to state
      setToken(token);
      setUser(user);

      // Save to storage
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // Set axios auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Đăng ký thất bại';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    console.log('logging out');
    try {
      setIsLoading(true);

      // Clear state
      setToken(null);
      setUser(null);
      setError(null);

      // Clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');

      // Clear axios auth header
      delete axios.defaults.headers.common['Authorization'];

      // Navigate to login screen after logout if the navigation is ready
      console.log('logging out');
      navigationRef.navigate('Auth' as never);
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    isUserLoggedIn,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};
