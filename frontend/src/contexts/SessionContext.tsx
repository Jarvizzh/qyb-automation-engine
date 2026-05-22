import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

import axios from 'axios';
import { useToast } from '../components/Toast/ToastContext';
import { useConfirm } from './ConfirmContext';
import type { UserSession } from '../types';

interface SessionContextType {
  isVerified: boolean | null;
  sessions: UserSession[];
  selectedMobile: string;
  setSelectedMobile: (mobile: string) => void;
  checkAuthStatus: () => Promise<void>;
  verifySecret: (key: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  loginAccount: (mobile: string, password: string) => Promise<boolean>;
  revokeSession: (mobile: string) => Promise<void>;
  apiBase: string;
  wsBase: string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:8000" : "");
const WS_BASE = (API_BASE || window.location.origin).replace(/^http/, 'ws');

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [selectedMobile, setSelectedMobileState] = useState('');

  const setSelectedMobile = (mobile: string) => {
    setSelectedMobileState(mobile);
    if (mobile) {
      localStorage.setItem('selectedMobile', mobile);
    } else {
      localStorage.removeItem('selectedMobile');
    }
  };

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/check-status`);
      setIsVerified(res.data.is_verified);
    } catch (err) {
      console.error("Check auth status failed", err);
      setIsVerified(false);
    }
  };

  const verifySecret = async (key: string): Promise<boolean> => {
    try {
      await axios.post(`${API_BASE}/api/auth/verify-secret`, { secret_key: key });
      setIsVerified(true);
      addToast("系统激活成功", "success");
      return true;
    } catch (err: any) {
      addToast("验证失败: " + (err.response?.data?.detail || err.message), "error");
      return false;
    }
  };

  const logout = async () => {
    if (!await confirm({
      title: '确认退出系统',
      message: '确定要退出当前自动化系统吗？',
      confirmText: '确认退出',
      cancelText: '取消',
      type: 'warning'
    })) return;

    try {
      await axios.post(`${API_BASE}/api/auth/logout`);
      setIsVerified(false);
      localStorage.removeItem('currentTaskId');
      localStorage.removeItem('previewTasks');
      localStorage.removeItem('selectedMobile');
      setSessions([]);
      setSelectedMobileState('');
      addToast("已成功退出系统", "info");
    } catch (err) {
      console.error("Logout failed", err);
      addToast("退出系统失败", "error");
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/sessions`);
      setSessions(res.data);
      if (res.data.length > 0) {
        setSelectedMobileState((prev) => {
          if (prev && res.data.some((s: any) => s.mobile === prev)) {
            return prev;
          }
          const savedMobile = localStorage.getItem('selectedMobile');
          if (savedMobile && res.data.some((s: any) => s.mobile === savedMobile)) {
            return savedMobile;
          }
          return res.data[0].mobile;
        });
      } else {
        setSelectedMobileState('');
      }
    } catch (err) {
      console.error("Fetch sessions failed", err);
    }
  };

  const loginAccount = async (mobile: string, password: string): Promise<boolean> => {
    try {
      await axios.post(`${API_BASE}/api/auth/login`, { mobile, password });
      await fetchSessions();
      addToast("登录授权成功", "success");
      return true;
    } catch (err: any) {
      addToast("登录失败: " + (err.response?.data?.detail || err.message), "error");
      return false;
    }
  };

  const revokeSession = async (mobile: string) => {
    if (!await confirm({
      title: '取消授权确认',
      message: `确定要取消账号 ${mobile} 的授权吗？`,
      confirmText: '确定取消',
      cancelText: '保留授权',
      type: 'danger'
    })) return;
    try {
      await axios.delete(`${API_BASE}/api/auth/sessions/${mobile}`);
      await fetchSessions();
      if (selectedMobile === mobile) setSelectedMobile('');
      addToast("授权已取消", "info");
    } catch (err: any) {
      addToast("取消授权失败: " + (err.response?.data?.detail || err.message), "error");
    }
  };

  // Recover session on mount
  useEffect(() => {
    checkAuthStatus();
    fetchSessions();
  }, []);

  return (
    <SessionContext.Provider value={{
      isVerified,
      sessions,
      selectedMobile,
      setSelectedMobile,
      checkAuthStatus,
      verifySecret,
      logout,
      fetchSessions,
      loginAccount,
      revokeSession,
      apiBase: API_BASE,
      wsBase: WS_BASE
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
