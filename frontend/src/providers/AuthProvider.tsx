import React, { createContext, useContext } from 'react';
const AuthContext = createContext<any>(null);
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);