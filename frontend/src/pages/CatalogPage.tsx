import React, { useState, useEffect } from 'react';
import { Plus, Folder, Tag, Layers, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';
import { PageHeader, Button, Tabs, DataTable, Modal, Badge } from '../components/ui';
import { catalogService, Category, Brand, Model } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState('categories');

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id?: string; name: string; categoryId?: string; brandId?: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, brs, mdls] = await Promise.all([
        catalogService.getCategories(),
        catalogService.getBrands(),
        catalogService.getModels(),
      ]);
      setCategories(cats);
      setBrands(brs);
      setModels(mdls);
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
    { id: 'models', label: 'Modelos', icon: <Layers size={16} /> },
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
    } else if (activeTab === 'brands') {
      if (selectedItem.id) {
        await catalogService.updateBrand(selectedItem.id, selectedItem.name.trim(), selectedItem.categoryId);
      } else {
        await catalogService.createBrand(selectedItem.name.trim(), selectedItem.categoryId);
      }
    } else {
      if (selectedItem.id) {
        await catalogService.updateModel(selectedItem.id, selectedItem.name.trim(), selectedItem.brandId);
      } else {
        await catalogService.createModel(selectedItem.name.trim(), selectedItem.brandId);
      }
    }

    await loadData();
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleDelete = (id: string) => {
    const itemType = activeTab === 'categories' ? 'categoría' : activeTab === 'brands' ? 'marca' : 'modelo';
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
        } else if (activeTab === 'brands') {
          await catalogService.deleteBrand(id);
        } else {
          await catalogService.deleteModel(id);
        }
        await loadData();
      }
    });
  };

  const getActiveData = () => {
    if (activeTab === 'categories') return categories;
    if (activeTab === 'brands') return brands;
    return models;
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
  ] : activeTab === 'brands' ? [
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
  ] : [
    {
      key: 'name',
      header: 'Modelo',
      render: (r: Model) => (
        <div className="font-bold text-primary flex items-center gap-2">
          <Layers size={16} className="text-primary-600" />
          <span>{r.name}</span>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: 'Marca Vinculada',
      render: (r: Model) => (
        <div className="flex items-center gap-1.5">
          {r.brandId ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Tag size={12} />
              {r.brandName}
            </span>
          ) : (
            <span className="text-xs text-secondary italic">Sin marca (General)</span>
          )}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (r: Model) => (
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
        subtitle="Administración de categorías, marcas y modelos de vehículos"
        action={
          <Button onClick={() => { setSelectedItem({ name: '', categoryId: '', brandId: '' }); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-1.5 inline" /> {activeTab === 'categories' ? 'Nueva Categoría' : activeTab === 'brands' ? 'Nueva Marca' : 'Nuevo Modelo'}
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
          searchPlaceholder={`Buscar en ${activeTab === 'categories' ? 'categorías' : activeTab === 'brands' ? 'marcas' : 'modelos'}...`}
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
                    brandId: row.brandId || '',
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

      {/* Modal for Creating / Editing Category, Brand or Model */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedItem?.id
            ? `Editar ${activeTab === 'categories' ? 'Categoría' : activeTab === 'brands' ? 'Marca' : 'Modelo'}`
            : `Nueva ${activeTab === 'categories' ? 'Categoría' : activeTab === 'brands' ? 'Marca' : 'Modelo'}`
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label font-semibold">
              {activeTab === 'models' ? 'Nombre del Modelo' : `Nombre de la ${activeTab === 'categories' ? 'Categoría' : 'Marca'}`}
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={activeTab === 'categories' ? 'Ej. Motocicleta, Repuesto' : activeTab === 'brands' ? 'Ej. Pulsar, Yamaha, Chino' : 'Ej. Pulsar 200 NS, FZ-16'}
              value={selectedItem?.name || ''}
              onChange={(e) => setSelectedItem(prev => ({ id: prev?.id, name: e.target.value, categoryId: prev?.categoryId, brandId: prev?.brandId }))}
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
                onChange={(e) => setSelectedItem(prev => ({ id: prev?.id, name: prev?.name || '', categoryId: e.target.value, brandId: prev?.brandId }))}
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

          {activeTab === 'models' && (
            <div>
              <label className="form-label font-semibold flex items-center gap-1.5">
                <LinkIcon size={14} className="text-primary-600" />
                Vincular a Marca
              </label>
              <select
                className="form-control"
                value={selectedItem?.brandId || ''}
                onChange={(e) => setSelectedItem(prev => ({ id: prev?.id, name: prev?.name || '', categoryId: prev?.categoryId, brandId: e.target.value }))}
              >
                <option value="">-- Sin Marca (General) --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-secondary mt-1">
                Al vincular este modelo a una marca (ej. Bajaj), aparecerá asociada a ella en todo el sistema.
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
