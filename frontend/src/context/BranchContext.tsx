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
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    return localStorage.getItem('active_branch_id') || 'ALL';
  });
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);

  const reloadBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const data = await branchesService.getBranches();
      const activeBranches = data.filter((b) => b.status === 'ACTIVE');
      setBranches(activeBranches);

      if (activeBranchId !== 'ALL' && !activeBranches.some((b) => b.id === activeBranchId)) {
        const defaultId = activeBranches[0]?.id || 'ALL';
        setActiveBranchIdState(defaultId);
        localStorage.setItem('active_branch_id', defaultId);
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
