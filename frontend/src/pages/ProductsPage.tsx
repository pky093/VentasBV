import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, Link as LinkIcon, X, CheckCircle2, Search } from 'lucide-react';
import { PageHeader, Button, Badge, Modal, DataTable, Tabs } from '../components/ui';
import { productsService, catalogService, Product, Category, Brand } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
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
  const [customMarginPct, setCustomMarginPct] = useState<string>('30');

  const [geminiSummary, setGeminiSummary] = useState('');
  const [geminiError, setGeminiError] = useState('');

  const handleSearchCompetitors = async () => {
    if (!selectedProduct?.name?.trim()) {
      alert('Ingresa el nombre del producto para realizar la consulta.');
      return;
    }
    setIsSearchingMarket(true);
    setMarketCompetitors([]);
    setGeminiSummary('');
    setGeminiError('');

    try {
      const { queryMarketPrices } = await import('../lib/gemini-market');
      const result = await queryMarketPrices(
        selectedProduct.category || '',
        selectedProduct.brand || '',
        selectedProduct.name || ''
      );

      if (result.error) {
        setGeminiError(result.error);
        setMarketCompetitors([]);
      } else {
        setGeminiSummary(result.summary);
        // Map Gemini results to the format our UI expects
        const storeColors = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
        const mapped = result.stores.map((s, idx) => ({
          name: s.storeName,
          pricePEN: s.pricePEN,
          priceUSD: s.priceUSD,
          currency: s.priceUSD ? 'USD' : 'PEN',
          color: storeColors[idx % storeColors.length],
          textColor: '#FFFFFF',
          url: s.url,
          notes: s.notes || '',
        }));
        setMarketCompetitors(mapped);
      }
    } catch (err) {
      console.error('Error al consultar Gemini:', err);
      setGeminiError('Error inesperado al consultar precios de mercado.');
    } finally {
      setIsSearchingMarket(false);
    }
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
                    onChange={(e) => {
                      const newCategoryName = e.target.value;
                      const catObj = categories.find(c => c.name === newCategoryName);
                      
                      const matchingBrands = catObj
                        ? brands.filter(b => 
                            (b.categoryId && b.categoryId === catObj.id) || 
                            (b.category_id && b.category_id === catObj.id) || 
                            (b.categoryName && b.categoryName === newCategoryName) || 
                            (b.category_name && b.category_name === newCategoryName)
                          )
                        : brands;
                        
                      const newBrandName = matchingBrands.length > 0 ? matchingBrands[0].name : '';
                      const newBrandId = matchingBrands.length > 0 ? matchingBrands[0].id : '';

                      setSelectedProduct({
                        ...selectedProduct,
                        category: newCategoryName,
                        categoryId: catObj?.id,
                        brand: newBrandName,
                        brandId: newBrandId,
                      });
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MARCA (Filtrada por Categoría Seleccionada) */}
                <div className="form-group">
                  <label className="form-label font-bold">Marca</label>
                  <select
                    className="form-control"
                    value={selectedProduct?.brand || ''}
                    onChange={(e) => {
                      const bObj = brands.find(b => b.name === e.target.value);
                      setSelectedProduct({
                        ...selectedProduct,
                        brand: e.target.value,
                        brandId: bObj?.id,
                      });
                    }}
                  >
                    {(() => {
                      const currentCatObj = categories.find(c => c.name === selectedProduct?.category);
                      const filteredBrands = currentCatObj
                        ? brands.filter(b => 
                            (b.categoryId && b.categoryId === currentCatObj.id) || 
                            (b.category_id && b.category_id === currentCatObj.id) || 
                            (b.categoryName && b.categoryName === currentCatObj.name) || 
                            (b.category_name && b.category_name === currentCatObj.name)
                          )
                        : brands;

                      if (filteredBrands.length === 0) {
                        return <option value="">Sin marcas vinculadas</option>;
                      }

                      return filteredBrands.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ));
                    })()}
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

                {/* STOCK ACTUAL */}
                <div className="form-group">
                  <label className="form-label font-bold">Stock Inicial</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="10"
                    value={selectedProduct?.stock ?? ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, stock: parseInt(e.target.value) || 0 })}
                    required
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
              <div className="border border-color rounded-xl p-4 bg-surface shadow-xs space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm text-primary mb-1">
                    Márgenes Sugeridos
                  </h4>
                  <p className="text-[10px] text-secondary leading-relaxed">
                    Calculados sobre el costo de compra (<strong>S/ {(selectedProduct?.cost || 0).toFixed(2)}</strong>).
                  </p>
                </div>

                {/* Custom Margin Input */}
                <div className="p-3 rounded-lg border border-color bg-app space-y-2">
                  <label className="text-[11px] font-bold text-primary block">
                    Margen Personalizado
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-color bg-surface px-2.5 py-1 focus-within:border-primary-600 flex-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        className="w-full bg-transparent text-xs font-bold text-primary outline-none"
                        placeholder="30"
                        value={customMarginPct}
                        onChange={(e) => setCustomMarginPct(e.target.value)}
                      />
                      <span className="text-xs font-bold text-secondary ml-1 shrink-0">%</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm text-xs font-bold px-3 py-1.5 shrink-0"
                      onClick={() => {
                        const pctVal = parseFloat(customMarginPct) || 0;
                        const costVal = selectedProduct?.cost || 0;
                        const calculatedPrice = parseFloat((costVal * (1 + pctVal / 100)).toFixed(2));
                        setSelectedProduct({ ...selectedProduct, price: calculatedPrice });
                      }}
                    >
                      Aplicar S/ {((selectedProduct?.cost || 0) * (1 + (parseFloat(customMarginPct) || 0) / 100)).toFixed(2)}
                    </button>
                  </div>
                </div>

                {/* Preset Options */}
                <div>
                  <div className="text-[10px] font-bold text-secondary uppercase mb-2">Preajustes Rápidos</div>
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
                          onClick={() => {
                            setCustomMarginPct(item.pct.replace('%', ''));
                            setSelectedProduct({ ...selectedProduct, price: priceVal });
                          }}
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
              </div>

              {/* COMPETITOR MARKET PRICE CHECKER */}
              <div className="border border-color rounded-xl p-4 bg-surface shadow-xs space-y-3">
                <div>
                  <h4 className="font-extrabold text-sm text-primary mb-1">
                    Consultar Mercado (IA)
                  </h4>
                  <p className="text-[10px] text-secondary leading-relaxed">
                    Obtén precios de referencia y tiendas donde se comercializa este producto en Perú.
                  </p>
                </div>

                {isSearchingMarket ? (
                  <div className="py-8 text-center">
                    <div className="relative inline-flex items-center justify-center mb-3">
                      <div className="animate-spin w-8 h-8 border-[3px] border-primary-200 border-t-primary-600 rounded-full"></div>
                      <Search size={12} className="absolute text-primary-600" />
                    </div>
                    <p className="text-[11px] text-primary font-bold">Consultando precios de mercado...</p>
                    <p className="text-[9px] text-muted mt-1">Buscando en tiendas activas de Perú</p>
                  </div>
                ) : geminiError ? (
                  <div className="py-3 px-3 text-center border border-dashed border-red-300 rounded-xl bg-red-50/30 space-y-2">
                    <p className="text-[10px] text-red-600 font-bold">Error al realizar la consulta</p>
                    <p className="text-[9px] text-red-500 leading-relaxed">{geminiError}</p>
                    <button
                      type="button"
                      onClick={handleSearchCompetitors}
                      className="btn btn-primary btn-sm py-1.5 px-3 text-[10px] w-full font-bold"
                    >
                      Reintentar Consulta
                    </button>
                  </div>
                ) : marketCompetitors.length > 0 ? (
                  <div className="space-y-3">
                    {/* AI Summary */}
                    {geminiSummary && (
                      <div className="p-3 rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50/50 to-transparent">
                        <p className="text-[10px] text-secondary leading-relaxed">
                          <span className="font-bold text-primary">Resumen:</span>{' '}
                          {geminiSummary}
                        </p>
                      </div>
                    )}

                    {/* Store Cards */}
                    <div className="space-y-2.5">
                      {marketCompetitors.map((comp, idx) => {
                        const positionColors = [
                          { bg: 'from-emerald-500 to-emerald-600', label: 'Mejor precio', text: 'text-emerald-700' },
                          { bg: 'from-blue-500 to-blue-600', label: '', text: 'text-blue-600' },
                          { bg: 'from-amber-500 to-amber-600', label: '', text: 'text-amber-600' },
                          { bg: 'from-slate-500 to-slate-600', label: '', text: 'text-slate-600' },
                          { bg: 'from-rose-500 to-rose-600', label: '', text: 'text-rose-600' },
                        ];
                        const pos = positionColors[idx] || positionColors[positionColors.length - 1];
                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-color overflow-hidden hover:shadow-md transition-all group"
                          >
                            {/* Store header row */}
                            <div className="flex items-center justify-between px-3 py-2.5 bg-app/50">
                              <div className="flex items-center gap-2">
                                <span className={`flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br ${pos.bg} text-white text-[9px] font-black shrink-0`}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <span className="text-[11px] font-extrabold text-primary block leading-tight">
                                    {comp.name}
                                  </span>
                                  {idx === 0 && (
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wide">Mejor precio</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {comp.currency === 'USD' && comp.priceUSD ? (
                                  <>
                                    <span className="text-[13px] font-black text-primary block leading-tight">
                                      S/ {comp.pricePEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[9px] text-secondary font-medium">
                                      USD ${comp.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[13px] font-black text-primary block leading-tight">
                                    S/ {comp.pricePEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Link row */}
                            <div className="px-3 py-2 border-t border-color/50 flex items-center justify-between gap-2">
                              <a
                                href={comp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-primary-500 hover:text-primary-700 underline underline-offset-2 truncate flex-1 font-medium transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {comp.url}
                              </a>
                              <a
                                href={comp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-[9px] font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-0.5 rounded-md transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Visitar
                              </a>
                            </div>

                            {/* Notes */}
                            {comp.notes && (
                              <div className="px-3 pb-2">
                                <span className="text-[8px] text-secondary italic">{comp.notes}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[8px] text-muted">Los precios pueden variar</span>
                      <button
                        type="button"
                        onClick={handleSearchCompetitors}
                        className="text-[9px] font-bold text-primary-600 hover:text-primary-800 transition-colors"
                      >
                        Actualizar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleSearchCompetitors}
                      className="btn btn-primary btn-sm py-2 px-3 text-[11px] w-full font-bold"
                    >
                      Consultar Precios de Mercado
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