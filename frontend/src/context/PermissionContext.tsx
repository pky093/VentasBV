import React, { createContext, useContext, useState, useEffect } from 'react';
import { rolesService } from '../lib/db-services';

interface PermissionContextType {
  userRole: string;
  permissions: string[];
  hasPermission: (permissionCode: string) => boolean;
  setUserRole: (role: string) => void;
  reloadPermissions: () => Promise<void>;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  userRole: 'Vendedor',
  permissions: [],
  hasPermission: () => true,
  setUserRole: () => {},
  reloadPermissions: async () => {},
  isLoading: false,
});

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRoleState] = useState<string>(() => {
    return localStorage.getItem('user_role') || 'Vendedor';
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = async (roleName: string) => {
    setIsLoading(true);
    try {
      const cleanRole = (roleName || '').trim();
      if (cleanRole.toLowerCase() === 'super admin' || cleanRole.toLowerCase() === 'superadmin' || cleanRole.toLowerCase() === 'platform admin') {
        // Super Admin has all permissions unrestricted
        setPermissions(['*']);
        setIsLoading(false);
        return;
      }


      const roles = await rolesService.getRoles();
      const matched = roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
      if (matched && matched.permissions && matched.permissions.length > 0) {
        setPermissions(matched.permissions);
      } else {
        // Default role fallback permissions
        if (roleName.toLowerCase().includes('admin')) {
          setPermissions(['*']);
        } else if (roleName.toLowerCase().includes('vendedor')) {
          setPermissions(['dashboard.read', 'products.read', 'sales.read', 'sales.create', 'contracts.read', 'contracts.manage', 'customers.read', 'customers.manage', 'cash.read']);
        } else if (roleName.toLowerCase().includes('cajero')) {
          setPermissions(['dashboard.read', 'sales.read', 'sales.create', 'contracts.read', 'cash.read', 'cash.manage', 'billing.read', 'billing.manage']);
        } else if (roleName.toLowerCase().includes('almacen')) {
          setPermissions(['dashboard.read', 'catalog.read', 'products.read', 'products.create', 'products.edit', 'inventory.read', 'inventory.manage', 'purchases.read', 'purchases.create', 'suppliers.read']);
        } else {
          setPermissions(['dashboard.read']);
        }
      }
    } catch (err) {
      console.error('Error loading permissions for role:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions(userRole);
  }, [userRole]);

  const setUserRole = (role: string) => {
    localStorage.setItem('user_role', role);
    setUserRoleState(role);
  };

  const reloadPermissions = async () => {
    await loadPermissions(userRole);
  };

  const hasPermission = (permissionCode: string): boolean => {
    const cleanRole = (userRole || '').trim().toLowerCase();
    if (cleanRole === 'super admin' || cleanRole === 'superadmin' || cleanRole === 'platform admin' || permissions.includes('*')) {
      return true;
    }
    // Check direct code or wildcard (e.g. 'sales.*')
    if (permissions.includes(permissionCode)) return true;
    const [module, action] = permissionCode.split('.');
    if (permissions.includes(`${module}.*`)) return true;
    if (action === 'read' && permissions.includes(`${module}.manage`)) return true;
    return false;
  };

  return (
    <PermissionContext.Provider
      value={{
        userRole,
        permissions,
        hasPermission,
        setUserRole,
        reloadPermissions,
        isLoading,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);
