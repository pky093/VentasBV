import React, { useState, useEffect } from 'react';
import { Plus, Shield, Edit2, Trash2 } from 'lucide-react';
import { PageHeader, Button, Badge, Modal, DataTable } from '../components/ui';
import { usersService, UserMember } from '../lib/db-services';
import Swal from 'sweetalert2';

interface UserRecord {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  branches: string[];
  status: 'ACTIVE' | 'DISABLED';
  password?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<UserRecord> | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data: UserMember[] = await usersService.getUsers();
      setUsers(
        data.map((u) => ({
          id: u.id,
          username: u.email.split('@')[0] || u.name.toLowerCase().replace(/\s+/g, ''),
          full_name: u.name,
          email: u.email || 'usuario@ventasbv.com',
          role: u.role || 'Vendedor',
          branches: [u.branch || 'Sede Principal'],
          status: u.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
        }))
      );
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.full_name) return;

    setIsLoading(true);
    try {
      if (selectedUser.id) {
        const success = await usersService.updateUser(selectedUser.id, {
          name: selectedUser.full_name,
          email: selectedUser.email,
          role: selectedUser.role,
        });
        if (success) {
          await loadUsers();
        }
      } else {
        const newUser = await usersService.createUser({
          name: selectedUser.full_name,
          email: selectedUser.email || `${selectedUser.username || 'user'}@ventasbv.com`,
          role: selectedUser.role || 'Vendedor',
          branch: 'Sede Principal',
          status: 'ACTIVE',
        });
        if (newUser) {
          await loadUsers();
        }
      }
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error saving user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'full_name',
      header: 'Usuario',
      render: (row: UserRecord) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-sm shrink-0">
            {row.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sm text-primary">{row.full_name}</div>
            <div className="text-xs text-secondary">
              @{row.username} • {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol de Sistema',
      render: (row: UserRecord) => {
        const isSuper = row.role.toLowerCase().includes('super');
        const isAdmin = row.role.toLowerCase().includes('admin');
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              isSuper
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : isAdmin
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Shield size={12} /> {row.role}
          </span>
        );
      },
    },
    {
      key: 'branches',
      header: 'Sucursales Asignadas',
      render: (row: UserRecord) => (
        <div className="flex gap-1.5 flex-wrap">
          {row.branches.map((b, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-lg font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {b}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: UserRecord) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {row.status === 'ACTIVE' ? 'Activo' : 'Deshabilitado'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="Administra los miembros del equipo y sus permisos de acceso en Supabase"
        action={
          <Button onClick={() => { setSelectedUser({}); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-1.5 inline" /> Nuevo Usuario
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando usuarios desde Supabase...</div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Buscar por nombre, usuario o email..."
          actions={(row) => (
            <div className="flex items-center gap-1.5 justify-end">
              <button
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors border-0 bg-transparent cursor-pointer"
                title="Editar"
                onClick={() => { setSelectedUser(row); setIsModalOpen(true); }}
              >
                <Edit2 size={16} />
              </button>
              <button
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border-0 bg-transparent cursor-pointer"
                title="Eliminar"
                onClick={() => {
                  Swal.fire({
                    title: '¿Desea eliminar este usuario?',
                    text: `Esta acción eliminará de forma permanente al usuario "${row.full_name}" de la base de datos.`,
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
                      setIsLoading(true);
                      try {
                        const success = await usersService.deleteUser(row.id);
                        if (success) {
                          await loadUsers();
                        }
                      } catch (err) {
                        console.error('Error deleting user:', err);
                      } finally {
                        setIsLoading(false);
                      }
                    }
                  });
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser?.id ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Nombre Completo</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Carlos Vendedor"
              value={selectedUser?.full_name || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Usuario</label>
              <input
                type="text"
                className="form-control"
                placeholder="cvendedor"
                value={selectedUser?.username || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="carlos@ventasbv.com"
                value={selectedUser?.email || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label font-bold text-xs">Rol Asignado</label>
            <select
              className="form-control text-xs font-semibold"
              value={selectedUser?.role || 'Vendedor'}
              onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Administrador Sede">Administrador Sede</option>
              <option value="Cajero POS">Cajero POS</option>
              <option value="Vendedor">Vendedor</option>
            </select>
          </div>

          <div>
            <label className="form-label font-bold text-xs">Contraseña de Acceso</label>
            <input
              type="password"
              className="form-control text-xs font-mono"
              placeholder={selectedUser?.id ? '•••••••• (Dejar en blanco para mantener)' : 'Ingresa la contraseña del usuario'}
              value={selectedUser?.password || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, password: e.target.value })}
              required={!selectedUser?.id}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
