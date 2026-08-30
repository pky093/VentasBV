import React, { useState, useEffect } from 'react';
import { Plus, UserCheck, Building2, Phone, Mail, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import { PageHeader, Button, Badge, DataTable, Modal } from '../components/ui';
import { customersService, Customer, sunatReniecService } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Partial<Customer> | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await customersService.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleLookup = async () => {
    const doc = (selectedCustomer?.documentNumber || '').trim();
    if (!doc) {
      Swal.fire({ title: 'Documento vacío', text: 'Ingrese un número de DNI o RUC para consultar.', icon: 'info' });
      return;
    }

    setIsLookingUp(true);
    try {
      if (doc.length === 8) {
        const res = await sunatReniecService.consultarDni(doc);
        if (res.success && res.data) {
          setSelectedCustomer((prev) => ({
            ...prev,
            customerType: 'PERSON',
            documentType: 'DNI',
            documentNumber: doc,
            fullName: res.data?.nombreCompleto || '',
            name: res.data?.nombreCompleto || '',
          }));
          Swal.fire({
            title: '¡DNI Encontrado!',
            text: res.data.nombreCompleto,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({ title: 'Consulta DNI', text: res.message || 'No se encontraron datos.', icon: 'warning' });
        }
      } else if (doc.length === 11) {
        const res = await sunatReniecService.consultarRuc(doc);
        if (res.success && res.data) {
          setSelectedCustomer((prev) => ({
            ...prev,
            customerType: 'BUSINESS',
            documentType: 'RUC',
            documentNumber: doc,
            businessName: res.data?.razonSocial || '',
            name: res.data?.razonSocial || '',
            address: res.data?.direccion || prev?.address || '',
          }));
          Swal.fire({
            title: '¡RUC Encontrado en SUNAT!',
            html: `<p><strong>${res.data.razonSocial}</strong></p><p style="font-size:12px; color:#10b981;">${res.data.estado || 'ACTIVO'} • ${res.data.condicion || 'HABIDO'}</p>`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({ title: 'Consulta RUC', text: res.message || 'No se encontraron datos.', icon: 'warning' });
        }
      } else {
        Swal.fire({ title: 'Formato incorrecto', text: 'El DNI debe tener 8 dígitos y el RUC 11 dígitos.', icon: 'warning' });
      }
    } catch (err: any) {
      console.error('Error during customer lookup:', err);
      Swal.fire({ title: 'Error', text: 'Error al consultar el servicio.', icon: 'error' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setIsSubmitting(true);
    try {
      if (selectedCustomer.id) {
        const success = await customersService.updateCustomer(selectedCustomer.id, selectedCustomer);
        if (success) {
          await loadCustomers();
          setIsModalOpen(false);
          setSelectedCustomer(null);
          Swal.fire({
            title: '¡Cliente Actualizado!',
            text: 'Los datos del cliente se guardaron correctamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar los datos del cliente.',
            icon: 'error',
          });
        }
      } else {
        const isBusiness = selectedCustomer.customerType === 'BUSINESS';
        const created = await customersService.createCustomer({
          customerType: selectedCustomer.customerType || 'PERSON',
          documentType: selectedCustomer.documentType || (isBusiness ? 'RUC' : 'DNI'),
          documentNumber: selectedCustomer.documentNumber || '',
          fullName: isBusiness ? '' : (selectedCustomer.fullName || selectedCustomer.name || ''),
          businessName: isBusiness ? (selectedCustomer.businessName || selectedCustomer.name || '') : '',
          email: selectedCustomer.email || '',
          phone: selectedCustomer.phone || '',
          address: selectedCustomer.address || '',
        });

        if (created) {
          await loadCustomers();
          setIsModalOpen(false);
          setSelectedCustomer(null);
          Swal.fire({
            title: '¡Cliente Guardado!',
            text: 'El cliente fue registrado exitosamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo registrar el cliente en el sistema.',
            icon: 'error',
          });
        }
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error inesperado al guardar el cliente.',
        icon: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: '¿Desea eliminar este cliente?',
      text: 'Esta acción eliminará de forma permanente al cliente de la base de datos.',
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
          const success = await customersService.deleteCustomer(id);
          if (success) {
            setCustomers((prev) => prev.filter((c) => c.id !== id));
          } else {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el cliente.',
              icon: 'error',
              confirmButtonColor: '#3b82f6',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            });
          }
        } catch (err) {
          console.error('Error deleting customer:', err);
          Swal.fire({
            title: 'Error',
            text: 'Error al intentar eliminar el cliente.',
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
      header: 'Cliente / Razón Social',
      render: (r: Customer) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
              r.customerType === 'BUSINESS'
                ? 'bg-accent-100 text-accent-700 dark:bg-accent-950'
                : 'bg-primary-100 text-primary-700 dark:bg-primary-950'
            }`}
          >
            {r.customerType === 'BUSINESS' ? <Building2 size={18} /> : <UserCheck size={18} />}
          </div>
          <div>
            <div className="font-semibold text-primary">{r.name}</div>
            <div className="text-xs text-secondary">
              {r.documentType}: {r.documentNumber}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (r: Customer) => (
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
      key: 'address',
      header: 'Dirección',
      render: (r: Customer) => <span className="text-xs text-secondary">{r.address || '-'}</span>,
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
        title="Directorio de Clientes"
        subtitle="Gestión de personas y empresas compradoras en Supabase"
        action={
          <Button onClick={() => { setSelectedCustomer({ customerType: 'PERSON', documentType: 'DNI' }); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-1.5 inline" /> Nuevo Cliente
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando clientes desde Supabase...</div>
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          searchPlaceholder="Buscar por DNI/RUC o nombre..."
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button
                className="icon-btn icon-btn-sm btn-action-edit border-none"
                title="Editar"
                onClick={() => { setSelectedCustomer(row); setIsModalOpen(true); }}
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
        title={selectedCustomer?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tipo de Cliente</label>
              <select
                className="form-control"
                value={selectedCustomer?.customerType || 'PERSON'}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    customerType: e.target.value as any,
                    documentType: e.target.value === 'BUSINESS' ? 'RUC' : 'DNI',
                  })
                }
              >
                <option value="PERSON">Persona Natural</option>
                <option value="BUSINESS">Empresa (RUC)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Documento ({selectedCustomer?.documentType || 'DNI'})</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  className="form-control font-mono flex-1"
                  placeholder={selectedCustomer?.customerType === 'BUSINESS' ? '20600000000' : '70000000'}
                  value={selectedCustomer?.documentNumber || ''}
                  onChange={(e) => setSelectedCustomer({ ...selectedCustomer, documentNumber: e.target.value.replace(/\D/g, '') })}
                  required
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={isLookingUp || !selectedCustomer?.documentNumber}
                  className="btn btn-outline btn-sm px-2.5 flex items-center gap-1 font-bold text-primary-600 border-primary-300"
                  title="Consultar con SUNAT / RENIEC"
                >
                  {isLookingUp ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Buscar</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">
              {selectedCustomer?.customerType === 'BUSINESS' ? 'Razón Social' : 'Nombre Completo'}
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={selectedCustomer?.customerType === 'BUSINESS' ? 'Ej. Mi Empresa S.A.C.' : 'Ej. Juan Pérez'}
              value={selectedCustomer?.name || selectedCustomer?.fullName || selectedCustomer?.businessName || ''}
              onChange={(e) =>
                setSelectedCustomer({
                  ...selectedCustomer,
                  name: e.target.value,
                  fullName: e.target.value,
                  businessName: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Teléfono</label>
              <input
                type="text"
                className="form-control"
                placeholder="987 654 321"
                value={selectedCustomer?.phone || ''}
                onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="correo@ejemplo.com"
                value={selectedCustomer?.email || ''}
                onChange={(e) => setSelectedCustomer({ ...selectedCustomer, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Dirección Fiscal / Domicilio</label>
            <input
              type="text"
              className="form-control"
              placeholder="Av. Principal 123"
              value={selectedCustomer?.address || ''}
              onChange={(e) => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })}
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
