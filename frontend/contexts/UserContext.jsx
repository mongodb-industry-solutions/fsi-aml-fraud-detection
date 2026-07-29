"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

const STORAGE_KEY = 'threatsight360_user_role';

// Opening the demo should land straight in the analyst view — the persona this
// demo represents (Ana) is a Risk Analyst. Falling back to this skips the
// blocking role-selection modal; Risk Manager is still reachable from the
// header switcher.
const DEFAULT_ROLE = 'risk_analyst';

export function UserProvider({ children }) {
  const [role, setRoleState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load role from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = sessionStorage.getItem(STORAGE_KEY);
      if (storedRole === 'risk_analyst' || storedRole === 'risk_manager') {
        setRoleState(storedRole);
      } else {
        sessionStorage.setItem(STORAGE_KEY, DEFAULT_ROLE);
        setRoleState(DEFAULT_ROLE);
      }
      setIsInitialized(true);
    }
  }, []);

  const setRole = (newRole) => {
    if (typeof window !== 'undefined') {
      if (newRole === 'risk_analyst' || newRole === 'risk_manager') {
        sessionStorage.setItem(STORAGE_KEY, newRole);
        setRoleState(newRole);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
        setRoleState(null);
      }
    }
  };

  const clearRole = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      setRoleState(null);
    }
  };

  return (
    <UserContext.Provider value={{ role, setRole, clearRole, isInitialized }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

