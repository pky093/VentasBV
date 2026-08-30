import React, { useState, useEffect } from 'react';
import { Plus, Truck, Mail, Phone, Edit2, Trash2 } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, Modal } from '../components/ui';
import { suppliersService, Supplier } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Partial<Supplier> | null>(null);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const data = await suppliersService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    setIsSubmitting(true);
    try {
      if (selectedSupplier.id) {
        const success = await suppliersService.updateSupplier(selectedSupplier.id, selectedSupplier);
        if (success) {
          await loadSuppliers();
          setIsModalOpen(false);
          setSelectedSupplier(null);
          Swal.fire({
            title: '¡Proveedor Actualizado!',
            text: 'Los datos del proveedor se guardaron correctamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el proveedor.',
            icon: 'error',
          });
        }
      } else {
        const created = await suppliersService.createSupplier({
          ruc: selectedSupplier.ruc || '',
          businessName: selectedSupplier.businessName || '',
          contactName: selectedSupplier.contactName || '',
          phone: selectedSupplier.phone || '',
          email: selectedSupplier.email || '',
          address: selectedSupplier.address || '',
        });

        if (created) {
          await loadSuppliers();
          setIsModalOpen(false);
          setSelectedSupplier(null);
          Swal.fire({
            title: '¡Proveedor Guardado!',
            text: 'El proveedor fue registrado exitosamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear el proveedor.',
            icon: 'error',
          });
        }
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al guardar el proveedor.',
        icon: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: '¿Desea eliminar este proveedor?',
      text: 'Esta acción eliminará de forma permanente el proveedor de la base de datos.',
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
          const success = await suppliersService.deleteSupplier(id);
          if (success) {
            setSuppliers((prev) => prev.filter((s) => s.id !== id));
          } else {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el proveedor.',
              icon: 'error',
              confirmButtonColor: '#3b82f6',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            });
          }
        } catch (err) {
          console.error('Error deleting supplier:', err);
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
      key: 'businessName',
      header: 'Razón Social / Proveedor',
      render: (r: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold">
            <Truck size={18} />
          </div>
          <div>
            <div className="font-semibold text-primary">{r.businessName}</div>
            <div className="text-xs text-secondary">RUC: {r.ruc}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contactName',
      header: 'Contacto',
      render: (r: Supplier) => <span className="text-sm text-primary">{r.contactName || '-'}</span>,
    },
    {
      key: 'contactInfo',
      header: 'Teléfono / Correo',
      render: (r: Supplier) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-primary">
            <Phone size={12} /> {r.phone || '-'}
          </div>
          <div className="flex items-center gap-1 text-secondary">
            <Mail size={12} /> {r.email || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: () => <Badge variant="success">Activo</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gestión de Proveedores"
        subtitle="Directorio de empresas proveedoras en Supabase"
        action={
          <Button onClick={() => { setSelectedSupplier({}); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-1.5 inline" /> Nuevo Proveedor
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando proveedores desde Supabase...</div>
      ) : (
        <DataTable
          columns={columns}
          data={suppliers}
          searchPlaceholder="Buscar por RUC o Razón Social..."
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button
                className="icon-btn icon-btn-sm btn-action-edit border-none"
                title="Editar"
                onClick={() => { setSelectedSupplier(row); setIsModalOpen(true); }}
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
        title={selectedSupplier?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">RUC</label>
              <input
                type="text"
                className="form-control font-mono"
                placeholder="20100000001"
                value={selectedSupplier?.ruc || ''}
                onChange={(e) => setSelectedSupplier({ ...selectedSupplier, ruc: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Razón Social</label>
              <input
                type="text"
                className="form-control"
                placeholder="Distribuidora Tech S.A.C."
                value={selectedSupplier?.businessName || ''}
                onChange={(e) => setSelectedSupplier({ ...selectedSupplier, businessName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Contacto Comercial</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre del Vendedor"
                value={selectedSupplier?.contactName || ''}
                onChange={(e) => setSelectedSupplier({ ...selectedSupplier, contactName: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input
                type="text"
                className="form-control"
                placeholder="01 512-9000"
                value={selectedSupplier?.phone || ''}
                onChange={(e) => setSelectedSupplier({ ...selectedSupplier, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="ventas@proveedor.com"
              value={selectedSupplier?.email || ''}
              onChange={(e) => setSelectedSupplier({ ...selectedSupplier, email: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Dirección Fiscal</label>
            <input
              type="text"
              className="form-control"
              placeholder="Av. República de Panamá 3030"
              value={selectedSupplier?.address || ''}
              onChange={(e) => setSelectedSupplier({ ...selectedSupplier, address: e.target.value })}
            />
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
