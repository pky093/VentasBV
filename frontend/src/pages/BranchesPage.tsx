import React, { useState, useEffect } from 'react';
import { Plus, Store, Edit2, Trash2, MapPin, Phone, User } from 'lucide-react';
import { PageHeader, Button, Badge, Modal, DataTable } from '../components/ui';
import { branchesService, Branch } from '../lib/db-services';

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
        } else {
          alert('No se pudo actualizar la sucursal.');
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
        } else {
          alert('No se pudo crear la sucursal en Supabase.');
        }
      }
    } catch (err) {
      console.error('Error saving branch:', err);
      alert('Error al comunicarse con la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Desea eliminar esta sucursal de la base de datos?')) return;
    try {
      const success = await branchesService.deleteBranch(id);
      if (success) {
        setBranches((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert('No se pudo eliminar la sucursal.');
      }
    } catch (err) {
      console.error('Error deleting branch:', err);
      alert('Error de base de datos al eliminar.');
    }
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
                className="icon-btn btn-ghost text-secondary hover:text-primary-500"
                title="Editar"
                onClick={() => { setSelectedBranch(row); setIsModalOpen(true); }}
              >
                <Edit2 size={16} />
              </button>
              <button
                className="icon-btn btn-ghost text-secondary hover:text-danger-500"
                title="Eliminar"
                onClick={() => handleDelete(row.id)}
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
