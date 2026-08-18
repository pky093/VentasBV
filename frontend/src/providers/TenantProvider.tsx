import React, { createContext, useContext } from 'react';
const TenantContext = createContext<any>(null);
export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  return <TenantContext.Provider value={{}}>{children}</TenantContext.Provider>;
};
export const useTenant = () => useContext(TenantContext);