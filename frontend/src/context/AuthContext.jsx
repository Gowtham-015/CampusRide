import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,     setUserState] = useState(() => api.getUser());
  const [loading,  setLoading]   = useState(false);
  const [initDone, setInitDone]  = useState(false);

  const saveAuth = ({ token, user }) => {
    api.setToken(token);
    api.setUser(user);
    setUserState(user);
  };

  const logout = useCallback(() => {
    api.removeToken();
    api.removeUser();
    setUserState(null);
  }, []);

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      saveAuth(data);
      return data;
    } finally { setLoading(false); }
  };

  const registerUser = async (fields) => {
    setLoading(true);
    try {
      const data = await api.register(fields);
      saveAuth(data);
      return data;
    } finally { setLoading(false); }
  };

  // Refresh user data from server (call after KYC submission/approval)
  const refreshUser = useCallback(async () => {
    try {
      const u = await api.getMe();
      api.setUser(u);
      setUserState(u);
      return u;
    } catch { logout(); }
  }, [logout]);

  // Validate stored token on mount + load fresh user data including kycData
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then(u => { api.setUser(u); setUserState(u); })
        .catch(() => logout())
        .finally(() => setInitDone(true));
    } else {
      setInitDone(true);
    }
  }, []); // eslint-disable-line

  if (!initDone) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#07090d', color:'#f5a623', fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700 }}>
      CampusRide
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, registerUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
