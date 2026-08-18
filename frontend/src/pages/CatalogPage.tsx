import React, { useState, useEffect } from 'react';
import { Plus, Folder, Tag, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';
import { PageHeader, Button, Tabs, DataTable, Modal, Badge } from '../components/ui';
import { catalogService, Category, Brand } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState('categories');

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id?: string; name: string; categoryId?: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, brs] = await Promise.all([
        catalogService.getCategories(),
        catalogService.getBrands(),
      ]);
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { id: 'categories', label: 'Categorías', icon: <Folder size={16} /> },
    { id: 'brands', label: 'Marcas', icon: <Tag size={16} /> },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem?.name.trim()) return;

    if (activeTab === 'categories') {
      if (selectedItem.id) {
        await catalogService.updateCategory(selectedItem.id, selectedItem.name.trim());
      } else {
        await catalogService.createCategory(selectedItem.name.trim());
      }
    } else {
      if (selectedItem.id) {
        await catalogService.updateBrand(selectedItem.id, selectedItem.name.trim(), selectedItem.categoryId);
      } else {
        await catalogService.createBrand(selectedItem.name.trim(), selectedItem.categoryId);
      }
    }

    await loadData();
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleDelete = (id: string) => {
    const itemType = activeTab === 'categories' ? 'categoría' : 'marca';
    Swal.fire({
      title: `¿Desea eliminar esta ${itemType}?`,
      text: `Esta acción eliminará de forma permanente la ${itemType} de la base de datos.`,
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
        if (activeTab === 'categories') {
          await catalogService.deleteCategory(id);
        } else {
          await catalogService.deleteBrand(id);
        }
        await loadData();
      }
    });
  };

  const getActiveData = () => {
    if (activeTab === 'categories') return categories;
    return brands;
  };

  const columns = activeTab === 'categories' ? [
    {
      key: 'name',
      header: 'Categoría',
      render: (r: Category) => (
        <div className="font-bold text-primary flex items-center gap-2">
          <Folder size={16} className="text-primary-600" />
          <span>{r.name}</span>
        </div>
      ),
    },
    {
      key: 'brands',
      header: 'Marcas Vinculadas',
      render: (r: Category) => (
        <div className="flex flex-wrap gap-1.5 items-center">
          {r.brands && r.brands.length > 0 ? (
            r.brands.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
              >
                <Tag size={10} className="text-slate-500" />
                {b.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-secondary italic">Sin marcas asociadas</span>
          )}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (r: Category) => (
        <Badge variant={r.active !== false ? 'success' : 'secondary'}>
          {r.active !== false ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ] : [
    {
      key: 'name',
      header: 'Marca',
      render: (r: Brand) => (
        <div className="font-bold text-primary flex items-center gap-2">
          <Tag size={16} className="text-accent-600" />
          <span>{r.name}</span>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Categoría Vinculada',
      render: (r: Brand) => (
        <div className="flex items-center gap-1.5">
          {r.categoryId ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Folder size={12} />
              {r.categoryName}
            </span>
          ) : (
            <span className="text-xs text-secondary italic">Sin categoría (General)</span>
          )}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (r: Brand) => (
        <Badge variant={r.active !== false ? 'success' : 'secondary'}>
          {r.active !== false ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Catálogo Base"
        subtitle="Administración de categorías y vinculación de marcas asociadas"
        action={
          <Button onClick={() => { setSelectedItem({ name: '', categoryId: '' }); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-1.5 inline" /> {activeTab === 'categories' ? 'Nueva Categoría' : 'Nueva Marca'}
          </Button>
        }
      />

      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando datos del catálogo...</div>
      ) : (
        <DataTable
          columns={columns}
          data={getActiveData()}
          searchPlaceholder={`Buscar en ${activeTab === 'categories' ? 'categorías' : 'marcas'}...`}
          actions={(row: any) => (
            <div className="flex gap-2 justify-end">
              <button
                className="icon-btn icon-btn-sm btn-action-edit border-none"
                title="Editar"
                onClick={() => {
                  setSelectedItem({
                    id: row.id,
                    name: row.name,
                    categoryId: row.categoryId || '',
                  });
                  setIsModalOpen(true);
                }}
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

      {/* Modal for Creating / Editing Category or Brand */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedItem?.id
            ? `Editar ${activeTab === 'categories' ? 'Categoría' : 'Marca'}`
            : `Nueva ${activeTab === 'categories' ? 'Categoría' : 'Marca'}`
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label font-semibold">
              Nombre de la {activeTab === 'categories' ? 'Categoría' : 'Marca'}
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={activeTab === 'categories' ? 'Ej. Motocicleta, Repuesto' : 'Ej. Pulsar, Yamaha, Chino'}
              value={selectedItem?.name || ''}
              onChange={(e) => setSelectedItem(prev => ({ id: prev?.id, name: e.target.value, categoryId: prev?.categoryId }))}
              required
            />
          </div>

          {activeTab === 'brands' && (
            <div>
              <label className="form-label font-semibold flex items-center gap-1.5">
                <LinkIcon size={14} className="text-primary-600" />
                Vincular a Categoría
              </label>
              <select
                className="form-control"
                value={selectedItem?.categoryId || ''}
                onChange={(e) => setSelectedItem(prev => ({ id: prev?.id, name: prev?.name || '', categoryId: e.target.value }))}
              >
                <option value="">-- Sin Categoría (General) --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-secondary mt-1">
                Al vincular esta marca a una categoría (ej. Motocicleta), aparecerá asociada a ella en todo el sistema.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-color">
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
