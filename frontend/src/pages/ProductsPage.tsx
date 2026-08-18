import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, Link as LinkIcon, X, CheckCircle2, Search } from 'lucide-react';
import { PageHeader, Button, Badge, Modal, DataTable, Tabs } from '../components/ui';
import { productsService, catalogService, Product } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cover image input modes: 'FILE' or 'URL'
  const [imageInputMode, setImageInputMode] = useState<'FILE' | 'URL'>('URL');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Competitor pricing lookup simulation states
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);
  const [marketCompetitors, setMarketCompetitors] = useState<any[]>([]);

  const handleSearchCompetitors = () => {
    if (!selectedProduct?.name?.trim()) {
      alert('Ingresa el nombre del producto para realizar la consulta.');
      return;
    }
    setIsSearchingMarket(true);
    setMarketCompetitors([]);
    
    // Simulate real web scraping query with 1.2s loader delay
    setTimeout(() => {
      const name = selectedProduct.name || '';
      const cost = selectedProduct.cost || 0;
      const category = selectedProduct.category || '';
      const lowerName = name.toLowerCase();
      
      const isMoto = category.toLowerCase().includes('moto') || 
                     lowerName.includes('moto') || 
                     lowerName.includes('navi') || 
                     lowerName.includes('pulsar');
      
      const tc = 3.40; // Reference Exchange Rate USD -> PEN from somosmoto.pe
      
      let stores = [];
      
      if (isMoto) {
        // Motorcycle specialized stores (Somos Moto, Honda Oficial, Galgo, La Curacao, Efe)
        let baseUsd = 1710; // Default Honda Navi 110 price
        
        if (lowerName.includes('navi')) {
          baseUsd = 1710;
        } else if (lowerName.includes('pulsar')) {
          baseUsd = cost > 0 ? (cost / 3.75) * 1.45 : 3100;
        } else if (cost > 0) {
          baseUsd = cost / 3.75 * 1.5;
        }
        
        const isNaviSpecific = lowerName.includes('navi');
        const isPulsarSpecific = lowerName.includes('pulsar');
        
        stores = [
          {
            name: 'Somos Moto',
            pricePEN: isNaviSpecific ? 5814 : baseUsd * tc,
            priceUSD: baseUsd,
            currency: 'USD',
            color: '#000000',
            textColor: '#FFF159',
            url: isNaviSpecific 
              ? 'https://somosmoto.pe/honda/scooter/navi-110-2026/YaXv'
              : isPulsarSpecific
              ? 'https://somosmoto.pe/bajaj/pistera/pulsar-ns-200-fi-abs/NSPJ'
              : `https://www.google.com/search?q=site:somosmoto.pe+${encodeURIComponent(name)}`
          },
          {
            name: 'Honda Perú',
            pricePEN: isNaviSpecific ? 5814 : (baseUsd * 1.02) * tc,
            priceUSD: isNaviSpecific ? 1710 : baseUsd * 1.02,
            currency: 'USD',
            color: '#EC1C24',
            textColor: '#FFFFFF',
            url: isNaviSpecific
              ? 'https://motos.honda.com.pe/modelo/navi-110'
              : `https://www.google.com/search?q=site:motos.honda.com.pe+${encodeURIComponent(name)}`
          },
          {
            name: 'Galgo Perú',
            pricePEN: isNaviSpecific ? 5790 : baseUsd * tc,
            priceUSD: undefined,
            currency: 'PEN',
            color: '#10B981',
            textColor: '#FFFFFF',
            url: isNaviSpecific
              ? 'https://www.galgo.com/pe/motos/PE155-honda-navi'
              : isPulsarSpecific
              ? 'https://www.galgo.com/pe/moto/bajaj-pulsar-ns-200'
              : `https://www.google.com/search?q=site:galgo.com/pe+${encodeURIComponent(name)}`
          },
          {
            name: 'La Curacao',
            pricePEN: isNaviSpecific ? 6159 : baseUsd * 1.08 * tc,
            priceUSD: undefined,
            currency: 'PEN',
            color: '#005CA9',
            textColor: '#FFFFFF',
            url: isNaviSpecific
              ? 'https://www.lacuracao.pe/moto-honda-paseo-navi-verde-mhnapave/p'
              : isPulsarSpecific
              ? 'https://www.lacuracao.pe/moto-bajaj-pulsar-ns-200/p'
              : `https://www.google.com/search?q=site:lacuracao.pe+${encodeURIComponent(name)}`
          },
          {
            name: 'Tiendas Efe',
            pricePEN: isNaviSpecific ? 5934.97 : baseUsd * 1.05 * tc,
            priceUSD: undefined,
            currency: 'PEN',
            color: '#E30613',
            textColor: '#FFFFFF',
            url: isNaviSpecific
              ? 'https://www.efe.com.pe/motocicleta-navi-rojo-ch-navi110cc-rj.html'
              : isPulsarSpecific
              ? 'https://www.efe.com.pe/moto-bajaj-pulsar-ns-200/p'
              : `https://www.google.com/search?q=site:efe.com.pe+${encodeURIComponent(name)}`
          }
        ];
      } else {
        // General retail stores
        const basePen = cost > 0 ? cost * 1.5 : 50;
        stores = [
          {
            name: 'Ripley',
            pricePEN: basePen * 1.05,
            currency: 'PEN',
            color: '#5A2C87',
            textColor: '#FFFFFF',
            url: `https://www.google.com/search?q=site:simple.ripley.com.pe+${encodeURIComponent(name)}`
          },
          {
            name: 'Sodimac',
            pricePEN: basePen * 1.08,
            currency: 'PEN',
            color: '#EC1C24',
            textColor: '#FFFFFF',
            url: `https://www.google.com/search?q=site:sodimac.com.pe+${encodeURIComponent(name)}`
          },
          {
            name: 'Promart',
            pricePEN: basePen * 1.02,
            currency: 'PEN',
            color: '#FF6200',
            textColor: '#FFFFFF',
            url: `https://www.google.com/search?q=site:promart.pe+${encodeURIComponent(name)}`
          },
          {
            name: 'Falabella',
            pricePEN: basePen * 1.12,
            currency: 'PEN',
            color: '#00875A',
            textColor: '#FFFFFF',
            url: `https://www.google.com/search?q=site:falabella.com.pe+${encodeURIComponent(name)}`
          },
          {
            name: 'Plaza Vea',
            pricePEN: basePen * 0.95,
            currency: 'PEN',
            color: '#E30613',
            textColor: '#FFFFFF',
            url: `https://www.google.com/search?q=site:plazavea.com.pe+${encodeURIComponent(name)}`
          }
        ];
      }
      
      setMarketCompetitors(stores);
      setIsSearchingMarket(false);
    }, 1200);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats, brs] = await Promise.all([
        productsService.getProducts(),
        catalogService.getCategories(),
        catalogService.getBrands(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error('Error loading products from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    const defaultCat = categories[0]?.name || 'Motocicletas';
    const defaultCatId = categories[0]?.id;
    const defaultBrand = brands[0]?.name || 'Pulsar';
    const defaultBrandId = brands[0]?.id;

    setSelectedProduct({
      code: `PROD-${String(products.length + 1).padStart(3, '0')}`,
      sku: `PROD-${String(products.length + 1).padStart(3, '0')}`,
      name: '',
      category: defaultCat,
      categoryId: defaultCatId,
      brand: defaultBrand,
      brandId: defaultBrandId,
      price: 0,
      cost: 0,
      stock: 10,
      minStock: 5,
      status: 'ACTIVE',
      imagePath: '',
    });
    setImageUrlInput('');
    setMarketCompetitors([]);
    setIsSearchingMarket(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setImageUrlInput(product.imagePath || '');
    setMarketCompetitors([]);
    setIsSearchingMarket(false);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: '¿Desea eliminar este producto?',
      text: 'Esta acción eliminará de forma permanente el producto de la base de datos.',
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
          const success = await productsService.deleteProduct(id);
          if (success) {
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } else {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el producto de la base de datos.',
              icon: 'error',
              confirmButtonColor: '#3b82f6',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            });
          }
        } catch (error) {
          console.error('Error al eliminar:', error);
          Swal.fire({
            title: 'Error',
            text: 'Error de conexión con la base de datos.',
            icon: 'error',
            confirmButtonColor: '#3b82f6',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          });
        }
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedProduct((prev) => ({ ...prev, imagePath: base64String }));
        setImageUrlInput(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct?.name) return;

    setIsSubmitting(true);
    try {
      const matchedCat = categories.find((c) => c.name === selectedProduct.category) || categories[0];
      const matchedBrand = brands.find((b) => b.name === selectedProduct.brand) || brands[0];

      const finalImagePath = selectedProduct.imagePath || imageUrlInput || '';

      if (selectedProduct.id) {
        // Edit existing
        const success = await productsService.updateProduct(selectedProduct.id, {
          ...selectedProduct,
          categoryId: matchedCat?.id,
          brandId: matchedBrand?.id,
          imagePath: finalImagePath,
        });
        if (success) {
          await loadData();
          setIsModalOpen(false);
          setSelectedProduct(null);
        } else {
          alert('Error al actualizar el producto en Supabase.');
        }
      } else {
        // Create new
        const created = await productsService.createProduct({
          code: selectedProduct.code || `PROD-${Date.now()}`,
          sku: selectedProduct.sku || selectedProduct.code || `PROD-${Date.now()}`,
          name: selectedProduct.name,
          category: matchedCat?.name || selectedProduct.category || '',
          categoryId: matchedCat?.id,
          brand: matchedBrand?.name || selectedProduct.brand || '',
          brandId: matchedBrand?.id,
          price: Number(selectedProduct.price) || 0,
          cost: Number(selectedProduct.cost) || 0,
          stock: Number(selectedProduct.stock) || 0,
          minStock: Number(selectedProduct.minStock) || 5,
          status: selectedProduct.status || 'ACTIVE',
          imagePath: finalImagePath,
        });

        if (created) {
          await loadData();
          setIsModalOpen(false);
          setSelectedProduct(null);
        } else {
          alert('Error al guardar el nuevo producto en la base de datos.');
        }
      }
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Error de procesamiento con Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Código SKU',
      render: (row: Product) => (
        <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
          {row.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Producto / Marca',
      render: (row: Product) => (
        <div className="flex items-center gap-3">
          {row.imagePath ? (
            <img
              src={row.imagePath}
              alt={row.name}
              className="rounded-lg border border-color shrink-0 bg-surface"
              style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', objectFit: 'cover' }}
            />
          ) : (
            <div className="rounded-lg border border-color bg-surface flex items-center justify-center shrink-0 text-secondary" style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}>
              <ImageIcon size={18} />
            </div>
          )}
          <div>
            <div className="font-bold text-primary text-sm">{row.name}</div>
            <div className="text-xs text-secondary">
              Marca: <strong>{row.brand}</strong>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (row: Product) => <Badge variant="neutral">{row.category}</Badge>,
    },
    {
      key: 'price',
      header: 'Precio Venta',
      render: (row: Product) => (
        <div className="font-bold text-primary text-sm">S/ {row.price.toFixed(2)}</div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock Actual',
      render: (row: Product) => {
        const isCritical = row.stock <= row.minStock;
        return (
          <div>
            <span className={`font-bold text-xs ${isCritical ? 'text-danger-500' : 'text-primary'}`}>
              {row.stock} unid.
            </span>
            {isCritical && (
              <Badge variant="danger" className="ml-2 text-[10px]">
                Stock Bajo
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Product) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'secondary'}>
          {row.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gestión de Productos"
        subtitle="Administra el inventario de catálogo, imágenes de portada, precios y stock en Supabase"
        action={
          <Button variant="primary" icon={<Plus size={18} />} onClick={openCreateModal}>
            Nuevo Producto
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Cargando productos desde Supabase...</div>
      ) : (
        <DataTable
          columns={columns}
          data={products}
          searchPlaceholder="Buscar por código SKU, nombre, marca o categoría..."
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button
                className="icon-btn icon-btn-sm btn-action-edit border-none"
                title="Editar Producto"
                onClick={() => openEditModal(row)}
              >
                <Edit2 size={14} />
              </button>
              <button
                className="icon-btn icon-btn-sm btn-action-danger border-none"
                title="Eliminar Gasto"
                onClick={() => handleDelete(row.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        />
      )}

      {/* Create / Edit Product Modal - Clean 3x3 Layout with Cover Image */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct?.id ? 'Editar Producto' : 'Nuevo Producto en Catálogo'}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT 2/3 COLUMN: FORM FIELDS & COVER IMAGE */}
            <div className="lg:col-span-2 space-y-5">
              {/* COVER IMAGE SECTION */}
              <div className="p-4 border border-color rounded-xl bg-surface/50">
                <label className="form-label font-bold flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-primary text-sm">
                    <ImageIcon size={18} className="text-primary-600" /> Imagen de Portada del Producto
                  </span>
                  {selectedProduct?.imagePath && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct({ ...selectedProduct, imagePath: '' });
                        setImageUrlInput('');
                      }}
                      className="text-xs text-danger-500 hover:text-danger-600 font-semibold flex items-center gap-1"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <X size={14} /> Quitar imagen
                    </button>
                  )}
                </label>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  {/* Cover Image Live Preview Box */}
                  <div 
                    className="rounded-lg border-2 border-dashed border-color bg-surface flex flex-col items-center justify-center overflow-hidden shrink-0 relative group"
                    style={{ width: '176px', height: '128px', minWidth: '176px', minHeight: '128px', maxWidth: '176px', maxHeight: '128px' }}
                  >
                    {selectedProduct?.imagePath ? (
                      <img
                        src={selectedProduct.imagePath}
                        alt="Portada"
                        className="object-cover"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                      />
                    ) : (
                      <div className="text-center p-2 text-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={32} className="opacity-50" style={{ marginBottom: '4px' }} />
                        <span className="text-[11px] block font-medium">Sin Imagen de Portada</span>
                      </div>
                    )}
                  </div>

                  {/* Cover Image Input Controls */}
                  <div className="flex-1 space-y-3 w-full">
                    <Tabs
                      tabs={[
                        { id: 'URL', label: 'Pegar URL de Imagen', icon: <LinkIcon size={14} /> },
                        { id: 'FILE', label: 'Subir desde PC', icon: <Upload size={14} /> }
                      ]}
                      activeTab={imageInputMode}
                      onChange={(id) => setImageInputMode(id as 'URL' | 'FILE')}
                      variant="pills"
                    />

                    {imageInputMode === 'URL' ? (
                      <div>
                        <input
                          type="url"
                          className="form-control text-xs"
                          placeholder="Ej. https://images.unsplash.com/photo-1558981806-ec527fa84c39"
                          value={imageUrlInput}
                          onChange={(e) => {
                            setImageUrlInput(e.target.value);
                            setSelectedProduct({ ...selectedProduct, imagePath: e.target.value });
                          }}
                        />
                        <p className="text-[11px] text-secondary mt-1">
                          Ingresa el enlace directo (HTTP/HTTPS) a la imagen de portada.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="btn btn-secondary btn-sm inline-flex items-center cursor-pointer">
                          <Upload size={14} className="mr-1.5" /> Seleccionar Imagen de tu PC
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                        </label>
                        <p className="text-[11px] text-secondary mt-1">
                          Soporta archivos PNG, JPG, WEBP de alta calidad.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* INPUT FIELDS GRID (2 Columns on large screens) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SKU */}
                <div className="form-group">
                  <label className="form-label font-bold">Código SKU / Barras</label>
                  <input
                    type="text"
                    className="form-control font-mono"
                    placeholder="PROD-001"
                    value={selectedProduct?.code || ''}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, code: e.target.value, sku: e.target.value })
                    }
                    required
                  />
                </div>

                {/* NOMBRE */}
                <div className="form-group">
                  <label className="form-label font-bold">Nombre del Producto</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Motocicleta Pulsar XS 400"
                    value={selectedProduct?.name || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                    required
                  />
                </div>

                {/* CATEGORÍA */}
                <div className="form-group">
                  <label className="form-label font-bold">Categoría</label>
                  <select
                    className="form-control"
                    value={selectedProduct?.category || (categories[0]?.name ?? '')}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MARCA */}
                <div className="form-group">
                  <label className="form-label font-bold">Marca</label>
                  <select
                    className="form-control"
                    value={selectedProduct?.brand || (brands[0]?.name ?? '')}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, brand: e.target.value })}
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PRECIO VENTA */}
                <div className="form-group">
                  <label className="form-label font-bold">Precio Venta (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control font-bold text-primary-600"
                    placeholder="0.00"
                    value={selectedProduct?.price ?? ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                {/* COSTO COMPRA */}
                <div className="form-group">
                  <label className="form-label font-bold">Costo Compra (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={selectedProduct?.cost ?? ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {/* STOCK MÍNIMO */}
                <div className="form-group">
                  <label className="form-label font-bold">Stock Mínimo</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="5"
                    value={selectedProduct?.minStock ?? ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, minStock: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* ESTADO */}
                <div className="form-group">
                  <label className="form-label font-bold mb-2">Estado del Producto</label>
                  <div className="p-2.5 border border-color rounded-lg bg-surface flex items-center gap-3" style={{ height: '38px' }}>
                    <input
                      type="checkbox"
                      id="prodStatusToggle"
                      className="w-4 h-4 rounded border-color accent-primary-600 cursor-pointer"
                      checked={selectedProduct?.status === 'ACTIVE'}
                      onChange={(e) =>
                        setSelectedProduct({ ...selectedProduct, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })
                      }
                    />
                    <label htmlFor="prodStatusToggle" className="text-xs font-semibold text-primary mb-0 cursor-pointer">
                      {selectedProduct?.status === 'ACTIVE' ? 'Habilitado (Activo en POS)' : 'Inactivo'}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 1/3 COLUMN: PRICING INTELLIGENCE SIDEBAR */}
            <div className="lg:col-span-1 space-y-4">
              {/* SUGGESTED MARGINS CARD */}
              <div className="border border-color rounded-xl p-4 bg-surface shadow-xs">
                <h4 className="font-extrabold text-sm text-primary mb-2.5 flex items-center gap-1.5">
                  💡 Márgenes Sugeridos
                </h4>
                <p className="text-[10px] text-secondary mb-3 leading-relaxed">
                  Calculados sobre el costo de compra (<strong>S/ {(selectedProduct?.cost || 0).toFixed(2)}</strong>). Haz clic en uno para fijar el precio:
                </p>
                
                <div className="space-y-2">
                  {[
                    { pct: '10%', mult: 1.10, desc: 'Rotación Rápida' },
                    { pct: '50%', mult: 1.50, desc: 'Margen Estándar' },
                    { pct: '100%', mult: 2.00, desc: 'Margen Alto / Premium' }
                  ].map((item, idx) => {
                    const priceVal = parseFloat(((selectedProduct?.cost || 0) * item.mult).toFixed(2));
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="margin-suggestion-btn"
                        onClick={() => setSelectedProduct({ ...selectedProduct, price: priceVal })}
                      >
                        <div>
                          <div className="text-[11px] font-extrabold text-primary">{item.pct} ganancia</div>
                          <div className="text-[9px] text-secondary">{item.desc}</div>
                        </div>
                        <div className="text-xs font-extrabold text-primary-600">
                          S/ {priceVal.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COMPETITOR MARKET PRICE CHECKER */}
              <div className="border border-color rounded-xl p-4 bg-surface shadow-xs">
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="font-extrabold text-sm text-primary flex items-center gap-1.5">
                    🔍 Consultar Mercado
                  </h4>
                  {selectedProduct?.name?.trim() && (
                    <button
                      type="button"
                      onClick={handleSearchCompetitors}
                      className="btn btn-outline btn-sm py-0.5 px-2.5 text-[9px] font-bold inline-flex items-center gap-1"
                      disabled={isSearchingMarket}
                    >
                      <Search size={10} />
                      {isSearchingMarket ? 'Buscando...' : 'Consultar'}
                    </button>
                  )}
                </div>

                {isSearchingMarket ? (
                  <div className="py-6 text-center">
                    <div className="animate-spin inline-block w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-[9px] text-secondary">Buscando en tiendas retail...</p>
                  </div>
                ) : marketCompetitors.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[9px] text-secondary leading-relaxed">
                      Precios estimados de competidores. <strong>Haz clic en cualquier globo</strong> para abrir la búsqueda directa en la tienda:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {marketCompetitors.map((comp, idx) => (
                        <div
                          key={idx}
                          onClick={() => window.open(comp.url, '_blank')}
                          className="flex items-center justify-between p-2 rounded-lg border border-color hover:border-primary-500 hover:bg-app/40 transition-all cursor-pointer group"
                        >
                          <span 
                            className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border"
                            style={{ 
                              backgroundColor: comp.color, 
                              color: comp.textColor,
                              borderColor: 'rgba(0,0,0,0.1)'
                            }}
                          >
                            {comp.name}
                          </span>
                          <span className="text-[11px] font-extrabold text-primary flex items-center gap-1.5 flex-wrap justify-end">
                            {comp.currency === 'USD' && comp.priceUSD ? (
                              <>
                                <span className="text-secondary font-medium text-[9px]">USD ${comp.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                <span className="text-primary font-extrabold">(S/ {comp.pricePEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                              </>
                            ) : (
                              <span>S/ {comp.pricePEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}
                            <span className="text-[9px] text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-5 text-center border border-dashed border-color rounded-xl bg-app/30">
                    <p className="text-[11px] font-bold text-secondary mb-1">Precios en Tiendas Retail</p>
                    <p className="text-[9px] text-muted px-4 mb-2.5">Consulta cuánto cuesta este producto en Falabella, Sodimac, Promart y más.</p>
                    <button
                      type="button"
                      onClick={handleSearchCompetitors}
                      className="btn btn-primary btn-sm py-1 px-2.5 text-[9px]"
                    >
                      Analizar precios de mercado
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-color">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              {selectedProduct?.id ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}