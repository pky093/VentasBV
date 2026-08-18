import React, { useState, useEffect } from 'react';
import { 
  Plus, Shield, Check, Edit3, Trash2, Lock, UserCheck, CheckSquare, Square, 
  Search, CopyPlus, Users, Sparkles, LayoutDashboard, Package, 
  ShoppingCart, Archive, FileText, Settings, ChevronDown, ChevronRight,
  Info
} from 'lucide-react';
import { PageHeader, Button, Badge, Card, CardHeader, Modal } from '../components/ui';
import Swal from 'sweetalert2';

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  userInitials: string[];
  permissions: string[];
}

interface PermissionGroup {
  id: string;
  module: string;
  icon: React.ReactNode;
  description: string;
  permissions: { id: string; label: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  { 
    id: 'dashboard',
    module: 'Dashboard & Analítica', 
    icon: <LayoutDashboard size={18} />,
    description: 'Acceso a métricas generales y gráficos de rendimiento',
    permissions: [
      { id: 'dashboard.read', label: 'Ver Dashboard y Métricas' },
      { id: 'dashboard.manage', label: 'Exportar Reportes Principales' }
    ] 
  },
  { 
    id: 'catalog',
    module: 'Catálogo & Productos', 
    icon: <Package size={18} />,
    description: 'Gestión de categorías, marcas, atributos y stock de productos',
    permissions: [
      { id: 'catalog.read', label: 'Ver Catálogo y Categorías' },
      { id: 'catalog.manage', label: 'Crear / Editar Categorías' },
      { id: 'products.read', label: 'Ver Lista de Productos' },
      { id: 'products.create', label: 'Crear Nuevos Productos' },
      { id: 'products.edit', label: 'Editar Productos Existentes' },
      { id: 'products.delete', label: 'Eliminar Productos' }
    ] 
  },
  { 
    id: 'sales',
    module: 'Ventas & Punto de Venta (POS)', 
    icon: <ShoppingCart size={18} />,
    description: 'Atención en caja, procesamiento de cobros y ventas',
    permissions: [
      { id: 'sales.read', label: 'Ver Historial de Ventas' },
      { id: 'sales.create', label: 'Emitir Ventas en POS' },
      { id: 'sales.edit', label: 'Editar / Anular Ventas' },
      { id: 'sales.cancel', label: 'Aprobar Notas de Crédito' },
      { id: 'cash.read', label: 'Ver Arqueos de Caja Chica' },
      { id: 'cash.manage', label: 'Aperturar y Cerrar Caja' }
    ] 
  },
  { 
    id: 'inventory',
    module: 'Inventario & Proveedores', 
    icon: <Archive size={18} />,
    description: 'Movimientos de kardex, órdenes de compra y gestión de proveedores',
    permissions: [
      { id: 'inventory.read', label: 'Consultar Kardex de Stock' },
      { id: 'inventory.manage', label: 'Registrar Ajustes de Inventario' },
      { id: 'suppliers.read', label: 'Ver Directorio de Proveedores' },
      { id: 'purchases.read', label: 'Ver Órdenes de Compra' },
      { id: 'purchases.create', label: 'Generar Órdenes de Compra' }
    ] 
  },
  { 
    id: 'billing',
    module: 'Facturación & SUNAT', 
    icon: <FileText size={18} />,
    description: 'Emisión de comprobantes electrónicos, boletas y facturas',
    permissions: [
      { id: 'billing.read', label: 'Consultar Comprobantes Emitidos' },
      { id: 'billing.manage', label: 'Enviar Comprobantes a SUNAT' },
      { id: 'billing.void', label: 'Solicitar Anulaciones y Comunicaciones' }
    ] 
  },
  { 
    id: 'system',
    module: 'Sistema & Seguridad', 
    icon: <Settings size={18} />,
    description: 'Gestión de usuarios, auditoría de eventos y configuración',
    permissions: [
      { id: 'users.read', label: 'Ver Lista de Usuarios' },
      { id: 'users.manage', label: 'Crear / Editar Usuarios' },
      { id: 'audit.read', label: 'Ver Registros de Auditoría' },
      { id: 'settings.manage', label: 'Acceso a Configuración de Sistema' }
    ] 
  },
];

const PRESET_TEMPLATES = [
  { 
    title: 'Vendedor / POS', 
    icon: <ShoppingCart size={16} className="text-primary-600" />,
    desc: 'Atención en punto de venta y catálogo',
    perms: ['dashboard.read', 'products.read', 'sales.read', 'sales.create', 'cash.read'] 
  },
  { 
    title: 'Cajero / Facturador', 
    icon: <FileText size={16} className="text-primary-600" />,
    desc: 'Caja chica, cobros y facturación SUNAT',
    perms: ['dashboard.read', 'sales.read', 'cash.read', 'cash.manage', 'billing.read', 'billing.manage'] 
  },
  { 
    title: 'Gestor de Almacén', 
    icon: <Archive size={16} className="text-primary-600" />,
    desc: 'Control de kardex, compras y stock',
    perms: ['dashboard.read', 'products.read', 'inventory.read', 'inventory.manage', 'suppliers.read', 'purchases.read', 'purchases.create'] 
  },
  { 
    title: 'Auditor / Supervisor', 
    icon: <Shield size={16} className="text-primary-600" />,
    desc: 'Acceso de lectura a reportes y auditoría',
    perms: ['dashboard.read', 'dashboard.manage', 'catalog.read', 'products.read', 'sales.read', 'inventory.read', 'billing.read', 'audit.read'] 
  },
];

import { rolesService } from '../lib/db-services';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([
    { id: 'a1000000-0000-4000-a000-000000000001', name: 'Super Admin', description: 'Acceso total e ilimitado a todos los módulos del sistema', isSystem: true, userCount: 1, userInitials: ['AP'], permissions: ['*'] },
    { id: 'a1000000-0000-4000-a000-000000000002', name: 'Administrador Sede', description: 'Gestión operativa y supervisión de sucursal', isSystem: false, userCount: 2, userInitials: ['AP', 'CV'], permissions: ['*'] },
    { id: 'a1000000-0000-4000-a000-000000000003', name: 'Cajero POS', description: 'Apertura y cierre de caja chica, cobros y emisión de boletas/facturas', isSystem: false, userCount: 3, userInitials: ['MR', 'LC', 'JS'], permissions: ['dashboard.read', 'sales.read', 'cash.read', 'cash.manage', 'billing.read', 'billing.manage'] },
    { id: 'a1000000-0000-4000-a000-000000000004', name: 'Vendedor', description: 'Atención directa en punto de venta y consulta de catálogo', isSystem: false, userCount: 2, userInitials: ['CV', 'LC'], permissions: ['dashboard.read', 'products.read', 'sales.read', 'sales.create', 'cash.read'] },
  ]);

  const [activeRoleId, setActiveRoleId] = useState<string>('a1000000-0000-4000-a000-000000000001');

  useEffect(() => {
    rolesService.getRoles().then((dbRoles) => {
      if (dbRoles && dbRoles.length > 0) {
        setRoles(dbRoles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          userCount: r.id === 'a1000000-0000-4000-a000-000000000001' ? 1 : r.id === 'a1000000-0000-4000-a000-000000000002' ? 2 : 0,
          userInitials: r.id === 'a1000000-0000-4000-a000-000000000001' ? ['AP'] : r.id === 'a1000000-0000-4000-a000-000000000002' ? ['AP', 'CV'] : [],
          permissions: r.permissions || [],
        })));
      }
    });
  }, []);

  const [permSearch, setPermSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<Partial<Role>>({ name: '', description: '', permissions: [] });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedRole = roles.find(r => r.id === activeRoleId) || roles[0];

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Toggle single permission
  const handleTogglePermission = async (permId: string) => {
    if (!selectedRole || (selectedRole.isSystem && selectedRole.permissions.includes('*'))) return;

    const currentPerms = [...(selectedRole.permissions || [])];
    const exists = currentPerms.includes(permId);
    const updatedPerms = exists 
      ? currentPerms.filter(p => p !== permId) 
      : [...currentPerms, permId];

    // Optimistic Update
    setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: updatedPerms } : r));

    try {
      const success = await rolesService.updateRolePermissions(selectedRole.id, updatedPerms);
      if (success) {
        showNotification('Permiso actualizado en Supabase');
      } else {
        setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: currentPerms } : r));
        showNotification('Error al actualizar permiso');
      }
    } catch (err) {
      console.error(err);
      setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: currentPerms } : r));
    }
  };

  // Select all permissions in a module group
  const handleSelectAllModule = async (groupPermissions: { id: string }[]) => {
    if (!selectedRole || (selectedRole.isSystem && selectedRole.permissions.includes('*'))) return;

    const groupIds = groupPermissions.map(p => p.id);
    const currentPerms = [...(selectedRole.permissions || [])];
    const updatedSet = new Set([...currentPerms, ...groupIds]);
    const updatedPerms = Array.from(updatedSet);

    setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: updatedPerms } : r));
    
    try {
      const success = await rolesService.updateRolePermissions(selectedRole.id, updatedPerms);
      if (success) {
        showNotification('Permisos de módulo activados');
      } else {
        setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: currentPerms } : r));
      }
    } catch (err) {
      console.error(err);
      setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: currentPerms } : r));
    }
  };

  // Deselect all permissions in a module group
  const handleDeselectAllModule = async (groupPermissions: { id: string }[]) => {
    if (!selectedRole || (selectedRole.isSystem && selectedRole.permissions.includes('*'))) return;

    const groupIds = new Set(groupPermissions.map(p => p.id));
    const currentPerms = [...(selectedRole.permissions || [])];
    const updatedPerms = currentPerms.filter(id => !groupIds.has(id));

    setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: updatedPerms } : r));
    
    try {
      const success = await rolesService.updateRolePermissions(selectedRole.id, updatedPerms);
      if (success) {
        showNotification('Permisos de módulo desmarcados');
      } else {
        setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: currentPerms } : r));
      }
    } catch (err) {
      console.error(err);
      setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: currentPerms } : r));
    }
  };

  // Clone Existing Role
  const handleCloneRole = async (targetRole: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloneName = `${targetRole.name} (Copia)`;
    const cloneDesc = `Perfil duplicado basado en ${targetRole.name}`;

    try {
      const created = await rolesService.createRole({
        name: cloneName,
        description: cloneDesc,
        isSystem: false,
      }, [...targetRole.permissions]);

      if (created) {
        const clonedRole: Role = {
          id: created.id,
          name: cloneName,
          description: cloneDesc,
          isSystem: false,
          userCount: 0,
          userInitials: [],
          permissions: [...targetRole.permissions],
        };
        setRoles([...roles, clonedRole]);
        setActiveRoleId(clonedRole.id);
        showNotification(`Perfil duplicado como "${clonedRole.name}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRole = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (roles.length <= 1) return;
    const roleToDelete = roles.find(r => r.id === id);
    if (!roleToDelete) return;

    Swal.fire({
      title: '¿Desea eliminar este rol?',
      text: `Esta acción eliminará de forma permanente el rol "${roleToDelete.name}" de la base de datos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      customClass: {
        popup: 'rounded-2xl border border-color shadow-xl',
        confirmButton: 'btn btn-danger font-semibold px-4 py-2 text-sm',
        cancelButton: 'btn btn-secondary font-semibold px-4 py-2 text-sm',
      },
      buttonsStyling: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const success = await rolesService.deleteRole(id);
          if (success) {
            const filtered = roles.filter(r => r.id !== id);
            setRoles(filtered);
            if (activeRoleId === id) setActiveRoleId(filtered[0].id);
            showNotification('Rol eliminado');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleSaveRoleModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name?.trim()) return;

    if (roleForm.id) {
      const success = await rolesService.updateRole(roleForm.id, {
        name: roleForm.name,
        description: roleForm.description,
      });
      if (success) {
        setRoles(roles.map(r => r.id === roleForm.id ? { ...r, ...roleForm } as Role : r));
        showNotification('Rol actualizado correctamente');
      }
    } else {
      const defaultPerms = roleForm.permissions || ['dashboard.read'];
      const created = await rolesService.createRole({
        name: roleForm.name,
        description: roleForm.description || '',
        isSystem: false,
      }, defaultPerms);

      if (created) {
        const newRole: Role = {
          id: created.id,
          name: roleForm.name,
          description: roleForm.description || '',
          isSystem: false,
          userCount: 0,
          userInitials: [],
          permissions: defaultPerms,
        };
        setRoles([...roles, newRole]);
        setActiveRoleId(newRole.id);
        showNotification('Nuevo rol creado y guardado en Supabase');
      }
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Roles y Matriz de Permisos"
        subtitle="Administra los perfiles de acceso y controles de seguridad para los usuarios"
        action={
          <Button 
            variant="primary" 
            icon={<Plus size={18} />}
            onClick={() => {
              setRoleForm({ name: '', description: '', permissions: ['dashboard.read'] });
              setIsModalOpen(true);
            }}
          >
            Nuevo Rol Personalizado
          </Button>
        }
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-fadeIn">
          <Check size={16} /> {toastMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Roles Cards */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider px-1 flex justify-between items-center">
            <span>Perfiles de Sistema ({roles.length})</span>
            <span className="text-[10px] text-muted">Haz clic para seleccionar</span>
          </div>

          {roles.map((role) => {
            const isActive = role.id === activeRoleId;
            const hasFullAccess = role.permissions.includes('*');
            return (
              <div
                key={role.id}
                onClick={() => setActiveRoleId(role.id)}
                className={`card p-4 cursor-pointer transition-all ${
                  isActive
                    ? 'border-primary-500 bg-surface shadow-md ring-2 ring-primary-500/20'
                    : 'bg-surface hover:border-neutral-300'
                }`}
                style={{
                  borderLeft: isActive ? '4px solid var(--primary-600)' : '4px solid transparent',
                  paddingLeft: isActive ? '12px' : '16px',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-colors ${
                      isActive ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400' : 'bg-app text-secondary'
                    }`} style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-primary">{role.name}</h3>
                      <div className="text-[11px] text-secondary font-medium mt-0.5">
                        {hasFullAccess ? 'Acceso Total' : `${role.permissions.length} permisos`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Modern borderless circle action buttons */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="icon-btn icon-btn-sm btn-action-edit border-none"
                      title="Duplicar / Clonar Perfil"
                      onClick={(e) => handleCloneRole(role, e)}
                    >
                      <CopyPlus size={14} />
                    </button>

                    {role.isSystem ? (
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800/40" 
                        title="Perfil de Sistema Protegido"
                      >
                        <Lock size={12} />
                      </div>
                    ) : (
                      <>
                        <button 
                          className="icon-btn icon-btn-sm btn-action-edit border-none"
                          title="Editar Nombre y Descripción"
                          onClick={(e) => {
                            setRoleForm(role);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="icon-btn icon-btn-sm btn-action-danger border-none"
                          title="Eliminar Rol"
                          onClick={(e) => handleDeleteRole(role.id, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-secondary leading-relaxed line-clamp-2 mt-1">
                  {role.description}
                </p>

                {/* User Avatars Stacked Group */}
                {role.userInitials.length > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-subtle flex-wrap gap-2">
                    <div className="flex items-center">
                      <div className="flex overflow-hidden mr-2">
                        {role.userInitials.map((init, i) => (
                          <div 
                            key={i} 
                            className="inline-block flex items-center justify-center text-[10px] font-extrabold text-primary-700 dark:text-primary-300"
                            style={{ 
                              marginLeft: i > 0 ? '-6px' : '0', 
                              zIndex: 10 - i,
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: i === 0 ? 'var(--primary-100)' : i === 1 ? 'var(--accent-100)' : 'var(--warning-100)',
                              border: '2px solid var(--bg-surface)'
                            }}
                          >
                            {init}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                        {role.userCount} {role.userCount === 1 ? 'Usuario' : 'Usuarios'}
                      </span>
                    </div>
                    {role.isSystem && (
                      <Badge variant="neutral" className="text-[9px] uppercase tracking-wider py-0.5">Sistema</Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Collapsible Interactive Permission Matrix */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title={`Matriz de Permisos: ${selectedRole.name}`}
              subtitle={selectedRole.description}
              action={
                selectedRole.isSystem && selectedRole.permissions.includes('*') ? (
                  <Badge variant="primary" icon={<Shield size={12} />}>Super Administrador</Badge>
                ) : (
                  <Badge variant="success" icon={<UserCheck size={12} />}>Perfil Editable</Badge>
                )
              }
            />

            {/* Matrix Search & Quick Tools Toolbar */}
            <div className="p-4 border-b border-color bg-app flex flex-wrap items-center justify-between gap-3">
              <div className="header-search flex-1 min-w-[200px]">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar permiso en la matriz..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                />
              </div>

              {!selectedRole.permissions.includes('*') && (
                <div className="text-xs text-secondary font-medium flex items-center gap-2">
                  <span>Permisos asignados: <strong className="text-primary">{selectedRole.permissions.length}</strong></span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              {selectedRole.permissions.includes('*') && (
                <div className="p-4 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/40 rounded-xl text-xs flex items-center gap-3">
                  <Shield className="text-primary-600 shrink-0" size={24} />
                  <div>
                    <strong className="block text-primary font-bold text-sm">Acceso Completo Administrador</strong>
                    <span className="text-secondary block mt-0.5">Este rol posee privilegios totales sobre todos los módulos y funciones del sistema sin restricciones.</span>
                  </div>
                </div>
              )}

              {PERMISSION_GROUPS.map((group) => {
                const matchingPerms = group.permissions.filter(p => 
                  p.label.toLowerCase().includes(permSearch.toLowerCase()) || 
                  p.id.toLowerCase().includes(permSearch.toLowerCase())
                );

                if (permSearch.trim() && matchingPerms.length === 0) return null;

                const isLocked = selectedRole.permissions.includes('*');
                const isCollapsed = !!collapsedGroups[group.id] && !permSearch.trim();

                const activeCount = group.permissions.filter(p => 
                  selectedRole.permissions.includes('*') || selectedRole.permissions.includes(p.id)
                ).length;

                return (
                  <div key={group.id} className="border border-color rounded-xl overflow-hidden bg-surface transition-all">
                    {/* Collapsible Section Header */}
                    <div 
                      onClick={() => toggleGroupCollapse(group.id)}
                      className="p-4 bg-surface hover:bg-surface-hover cursor-pointer flex flex-wrap justify-between items-center gap-3 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 text-white flex items-center justify-center shrink-0" style={{ 
                          backgroundColor: 
                            group.id === 'dashboard' ? '#3b82f6' : 
                            group.id === 'catalog' ? '#8b5cf6' : 
                            group.id === 'sales' ? '#10b981' : 
                            group.id === 'inventory' ? '#f59e0b' : 
                            group.id === 'billing' ? '#6366f1' : '#64748b',
                          borderRadius: '10px',
                          width: '38px',
                          height: '38px'
                        }}>
                          {group.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-primary">{group.module}</h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              activeCount > 0 
                                ? 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300' 
                                : 'bg-neutral-100 text-muted dark:bg-neutral-800'
                            }`}>
                              {activeCount} / {group.permissions.length} activos
                            </span>
                          </div>
                          <p className="text-xs text-secondary mt-0.5">{group.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        {/* Quick Module Check / Uncheck Actions */}
                        {!isLocked && (
                          <div className="flex items-center gap-1">
                            <button 
                              className="btn btn-xs btn-ghost text-[11px] py-1 px-2 hover:bg-success-50 text-success-600 font-semibold"
                              title="Marcar todos los permisos de este módulo"
                              onClick={() => handleSelectAllModule(group.permissions)}
                            >
                              <CheckSquare size={12} /> Permitir todo
                            </button>
                            <button 
                              className="btn btn-xs btn-ghost text-[11px] py-1 px-2 hover:bg-neutral-100 text-secondary font-semibold"
                              title="Desmarcar todos los permisos de este módulo"
                              onClick={() => handleDeselectAllModule(group.permissions)}
                            >
                              <Square size={12} /> Bloquear todo
                            </button>
                          </div>
                        )}

                        <div className="text-secondary p-1 cursor-pointer" onClick={() => toggleGroupCollapse(group.id)}>
                          {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* Section Body (Collapsible Content) */}
                    {!isCollapsed && (
                      <div className="p-4 pt-2 border-t border-color bg-app/40 flex flex-col items-center">
                        <div className="w-full max-w-2xl flex flex-col gap-2.5 py-1">
                          {matchingPerms.map((perm) => {
                            const isChecked = selectedRole.permissions.includes('*') || selectedRole.permissions.includes(perm.id);

                            return (
                              <div
                                key={perm.id}
                                onClick={() => !isLocked && handleTogglePermission(perm.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 select-none ${
                                  isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-neutral-300'
                                }`}
                                style={{
                                  borderColor: isChecked ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)',
                                  backgroundColor: isChecked ? 'rgba(34, 197, 94, 0.04)' : 'var(--bg-surface)',
                                  opacity: isChecked ? 1 : 0.8,
                                  boxShadow: isChecked ? '0 1px 3px rgba(34, 197, 94, 0.04)' : 'none',
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Custom Check Circular Badge */}
                                  {isChecked ? (
                                    <div className="w-5 h-5 rounded-full bg-success-100 dark:bg-success-950 text-success-600 dark:text-success-400 flex items-center justify-center shrink-0">
                                      <Check size={12} strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 flex items-center justify-center shrink-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                                    </div>
                                  )}
                                  <span className={`text-xs font-semibold ${isChecked ? 'text-primary' : 'text-secondary'}`}>
                                    {perm.label}
                                  </span>
                                </div>

                                <div>
                                  {isChecked ? (
                                    <Badge variant="success" className="text-[10px] py-0.5 px-2">Permitido</Badge>
                                  ) : (
                                    <Badge variant="neutral" className="text-[10px] py-0.5 px-2 opacity-50">Sin acceso</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal for Creating / Editing Roles with Presets */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={roleForm.id ? 'Editar Rol Personalizado' : 'Crear Nuevo Rol'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveRoleModal}>Guardar Rol</Button>
          </>
        }
      >
        <form onSubmit={handleSaveRoleModal} className="space-y-4">
          {!roleForm.id && (
            <div>
              <label className="form-label flex items-center gap-1.5 text-primary-600 font-bold mb-2">
                <Sparkles size={15} /> Usar Plantilla Rápida
              </label>
              
              {/* 2x2 Template Cards Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {PRESET_TEMPLATES.map((tpl, i) => {
                  const isSelected = roleForm.name === tpl.title;
                  return (
                    <div 
                      key={i}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/40 ring-2 ring-primary-500/20' 
                          : 'border-color bg-surface hover:bg-surface-hover hover:border-neutral-300'
                      }`}
                      onClick={() => {
                        setRoleForm({
                          ...roleForm,
                          name: tpl.title,
                          description: tpl.desc,
                          permissions: tpl.perms
                        });
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 rounded-lg bg-app text-primary flex items-center justify-center">
                          {tpl.icon}
                        </div>
                        <span className="font-bold text-xs text-primary">{tpl.title}</span>
                      </div>
                      <p className="text-[11px] text-secondary leading-snug">{tpl.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nombre del Rol</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Supervisor de Almacén"
              value={roleForm.name || ''}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-control h-20 resize-none"
              placeholder="Describe las responsabilidades y alcance de este rol..."
              value={roleForm.description || ''}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
