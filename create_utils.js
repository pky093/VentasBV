const fs = require('fs');
const path = require('path');

const root = path.resolve('C:/Users/pboca/.gemini/antigravity/scratch/VentasBV/frontend/src');

const files = {
  "contracts/index.ts": `export interface User { id: string; name: string; email: string; role: string; }`,
  
  "lib/api.ts": `export const api = {
  get: async <T>(url: string): Promise<T> => {
    return {} as T;
  },
  post: async <T>(url: string, data: any): Promise<T> => {
    return {} as T;
  }
};`,

  "lib/auth-store.ts": `export const getStoredSession = () => null;
export const setStoredSession = (session: any) => {};
export const clearStoredSession = () => {};
export const onAuthChange = (cb: any) => {};`,

  "lib/tenant-theme.ts": `export const applyTenantTheme = (theme: any) => {};`,

  "lib/module-access.ts": `export const canAccessModule = (module: string) => true;
export const firstAllowedPath = () => '/app';`,

  "lib/formatters.ts": `export const formatCurrency = (amount: number, currency: string = 'PEN') => {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount);
};
export const formatDate = (date: string) => new Date(date).toLocaleDateString('es-PE');`,

  "providers/AuthProvider.tsx": `import React, { createContext, useContext } from 'react';
const AuthContext = createContext<any>(null);
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);`,

  "providers/TenantProvider.tsx": `import React, { createContext, useContext } from 'react';
const TenantContext = createContext<any>(null);
export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  return <TenantContext.Provider value={{}}>{children}</TenantContext.Provider>;
};
export const useTenant = () => useContext(TenantContext);`,

  "hooks/useTenantApi.ts": `export const useTenantApi = () => {
  return {};
};`,

  "components/ui/index.tsx": `import React from 'react';

export const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className="btn btn-primary" {...props} />
);

export const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="card">{children}</div>
);

export const Badge = ({ children, variant = 'primary' }: { children: React.ReactNode, variant?: string }) => (
  <span className={\`badge badge-\${variant}\`}>{children}</span>
);`,

  "components/PermissionRoute.tsx": `import React from 'react';
export const PermissionRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};`
};

for (const [file, content] of Object.entries(files)) {
  const filePath = path.join(root, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
console.log("Utils created successfully.");
