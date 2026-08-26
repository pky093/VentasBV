import React, { createContext, useContext, useState, useEffect } from 'react';
import { branchesService, Branch } from '../lib/db-services';

interface BranchContextType {
  branches: Branch[];
  activeBranchId: string;
  activeBranch: Branch | null;
  setActiveBranchId: (id: string) => void;
  isLoadingBranches: boolean;
  isSuperAdmin: boolean;
  setIsSuperAdmin: (isSuper: boolean) => void;
  reloadBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  activeBranchId: 'ALL',
  activeBranch: null,
  setActiveBranchId: () => {},
  isLoadingBranches: true,
  isSuperAdmin: true,
  setIsSuperAdmin: () => {},
  reloadBranches: async () => {},
});

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const userRole = typeof window !== 'undefined' ? (localStorage.getItem('user_role') || '') : '';
  const isSuper = userRole.toLowerCase() === 'super admin' || userRole.toLowerCase() === 'superadmin' || userRole.toLowerCase() === 'platform admin';

  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    const saved = localStorage.getItem('active_branch_id');
    if (saved && (isSuper || saved !== 'ALL')) {
      return saved;
    }
    return isSuper ? 'ALL' : '';
  });
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(isSuper);

  const reloadBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const currentRole = typeof window !== 'undefined' ? (localStorage.getItem('user_role') || '') : '';
      const superStatus = currentRole.toLowerCase() === 'super admin' || currentRole.toLowerCase() === 'superadmin' || currentRole.toLowerCase() === 'platform admin';
      setIsSuperAdmin(superStatus);

      const data = await branchesService.getBranches();
      const activeBranches = data.filter((b) => b.status === 'ACTIVE');

      let allowedBranches = activeBranches;
      if (!superStatus) {
        // Read assigned branches from localStorage
        const assignedRaw = localStorage.getItem('assigned_branch_ids') || localStorage.getItem('assigned_branches');
        let assignedList: string[] = [];
        if (assignedRaw) {
          try {
            assignedList = JSON.parse(assignedRaw);
          } catch {
            assignedList = [assignedRaw];
          }
        }
        if (assignedList.length === 0) {
          const singleBranch = localStorage.getItem('active_branch_id') || localStorage.getItem('active_branch_name');
          if (singleBranch) assignedList = [singleBranch];
        }

        if (assignedList.length > 0) {
          allowedBranches = activeBranches.filter((b) =>
            assignedList.some(
              (a) =>
                a.toLowerCase().trim() === b.id.toLowerCase().trim() ||
                a.toLowerCase().trim() === b.name.toLowerCase().trim()
            )
          );
        }
      }

      if (allowedBranches.length === 0 && activeBranches.length > 0) {
        allowedBranches = [activeBranches[0]];
      }

      setBranches(allowedBranches);

      if ((!superStatus && activeBranchId === 'ALL') || (activeBranchId && !allowedBranches.some((b) => b.id === activeBranchId))) {
        const defaultId = allowedBranches[0]?.id || (superStatus ? 'ALL' : '');
        setActiveBranchIdState(defaultId);
        if (defaultId) {
          localStorage.setItem('active_branch_id', defaultId);
        }
      }
    } catch (err) {
      console.error('Error loading branches in BranchContext:', err);
    } finally {
      setIsLoadingBranches(false);
    }
  };


  useEffect(() => {
    reloadBranches();
  }, []);

  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
    localStorage.setItem('active_branch_id', id);
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranchId,
        activeBranch,
        setActiveBranchId,
        isLoadingBranches,
        isSuperAdmin,
        setIsSuperAdmin,
        reloadBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => useContext(BranchContext);
