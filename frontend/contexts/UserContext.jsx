"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

const STORAGE_KEY = 'threatsight360_user_role';

// Everyone lands as Risk Analyst — no role picker on first visit. Switching
// happens from the UserMenu dropdown.
const DEFAULT_ROLE = 'risk_analyst';

export function UserProvider({ children }) {
  const [role, setRoleState] = useState(DEFAULT_ROLE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore a previously chosen role from sessionStorage; otherwise keep the default.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = sessionStorage.getItem(STORAGE_KEY);
      if (storedRole === 'risk_analyst' || storedRole === 'risk_manager') {
        setRoleState(storedRole);
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
        setRoleState(DEFAULT_ROLE);
      }
    }
  };

  const clearRole = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      setRoleState(DEFAULT_ROLE);
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

