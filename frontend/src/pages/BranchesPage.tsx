import React, { useState, useEffect } from 'react';
import { Plus, Store, Edit2, Trash2, MapPin, Phone, User } from 'lucide-react';
import { PageHeader, Button, Badge, Modal, DataTable } from '../components/ui';
import { branchesService, Branch } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Partial<Branch> | null>(null);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const data = await branchesService.getBranches();
      setBranches(data);
    } catch (err) {
      console.error('Error loading branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch?.name) return;

    setIsSubmitting(true);
    try {
      if (selectedBranch.id) {
        const success = await branchesService.updateBranch(selectedBranch.id, selectedBranch);
        if (success) {
          await loadBranches();
          setIsModalOpen(false);
          setSelectedBranch(null);
          Swal.fire({
            title: '¡Sucursal Actualizada!',
            text: 'Los datos de la sucursal se guardaron correctamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar la sucursal.',
            icon: 'error',
          });
        }
      } else {
        const created = await branchesService.createBranch({
          name: selectedBranch.name,
          address: selectedBranch.address || '',
          phone: selectedBranch.phone || '',
          managerName: selectedBranch.managerName || '',
          status: 'ACTIVE',
        });
        if (created) {
          await loadBranches();
          setIsModalOpen(false);
          setSelectedBranch(null);
          Swal.fire({
            title: '¡Sucursal Guardada!',
            text: 'La sucursal fue creada exitosamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear la sucursal.',
            icon: 'error',
          });
        }
      }
    } catch (err) {
      console.error('Error saving branch:', err);
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al guardar la sucursal.',
        icon: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: '¿Desea eliminar esta sucursal?',
      text: 'Esta acción eliminará de forma permanente la sucursal de la base de datos.',
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
          const success = await branchesService.deleteBranch(id);
          if (success) {
            setBranches((prev) => prev.filter((b) => b.id !== id));
          } else {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar la sucursal.',
              icon: 'error',
              confirmButtonColor: '#3b82f6',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            });
          }
        } catch (err) {
          console.error('Error deleting branch:', err);
          Swal.fire({
            title: 'Error',
            text: 'Error de base de datos al eliminar.',
            icon: 'error',
            confirmButtonColor: '#3b82f6',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          });
        }
      }
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'Sucursal',
      render: (row: Branch) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-600 font-bold">
            <Store size={18} />
          </div>
          <div>
            <div className="font-semibold text-primary">{row.name}</div>
            <div className="text-xs text-secondary flex items-center gap-1">
              <MapPin size={12} /> {row.address || 'Sin dirección registrada'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contacto',
      render: (row: Branch) => (
        <div>
          <div className="text-sm font-medium text-primary flex items-center gap-1">
            <Phone size={12} /> {row.phone || 'Sin teléfono'}
          </div>
          <div className="text-xs text-secondary flex items-center gap-1">
            <User size={12} /> {row.managerName || 'Sin encargado'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Branch) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'secondary'}>
          {row.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gestión de Sucursales"
        subtitle="Administra las sedes físicas de tu empresa en Supabase"
        action={
          <Button onClick={() => { setSelectedBranch({}); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-1.5 inline" /> Nueva Sucursal
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando sucursales desde Supabase...</div>
      ) : (
        <DataTable
          columns={columns}
          data={branches}
          searchPlaceholder="Buscar por nombre o dirección..."
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button
                className="icon-btn icon-btn-sm btn-action-edit border-none"
                title="Editar"
                onClick={() => { setSelectedBranch(row); setIsModalOpen(true); }}
              >
                <Edit2 size={14} />
              </button>
              <button
                className="icon-btn icon-btn-sm btn-action-danger border-none"
                title="Eliminar"
                onClick={() => handleDelete(row.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBranch?.id ? 'Editar Sucursal' : 'Nueva Sucursal'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Nombre de Sucursal</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Sucursal Miraflores"
              value={selectedBranch?.name || ''}
              onChange={(e) => setSelectedBranch({ ...selectedBranch, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Dirección</label>
            <input
              type="text"
              className="form-control"
              placeholder="Av. Larco 1250"
              value={selectedBranch?.address || ''}
              onChange={(e) => setSelectedBranch({ ...selectedBranch, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Teléfono</label>
              <input
                type="text"
                className="form-control"
                placeholder="01 241-5530"
                value={selectedBranch?.phone || ''}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Encargado</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre del Encargado"
                value={selectedBranch?.managerName || ''}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, managerName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-color">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
