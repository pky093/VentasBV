import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, MessageCircle, Share2, FileDown, ExternalLink, 
  Search, Filter, Grid, MonitorPlay, RefreshCw, SlidersHorizontal, 
  Layers, Tag, CheckCircle2, ChevronRight, Fuel, Gauge, Disc, Eye
} from 'lucide-react';
import { productsService, catalogService, settingsService, Product, Category, Brand } from '../lib/db-services';
import { useBranch } from '../context/BranchContext';
import { SomomotoHeroShowcase } from '../components/catalog/SomomotoHeroShowcase';
import { WhatsAppShareModal } from '../components/catalog/WhatsAppShareModal';
import { exportProductFlyerPdf } from '../lib/catalog-flyer';
import Swal from 'sweetalert2';

export default function DigitalCatalogPage() {
  const { activeBranchId } = useBranch();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // View mode: 'SHOWCASE' (SomosMoto 1-on-1 Hero) or 'GRID' (Full Gallery)
  const [viewMode, setViewMode] = useState<'SHOWCASE' | 'GRID'>('SHOWCASE');
  const [currentShowcaseIndex, setCurrentShowcaseIndex] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(3.75);

  // WhatsApp Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappTargetProduct, setWhatsappTargetProduct] = useState<Product | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats, brs, tInfo] = await Promise.all([
        productsService.getProducts(activeBranchId),
        catalogService.getCategories(),
        catalogService.getBrands(),
        settingsService.getTenantInfo(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setBrands(brs || []);
      setTenantInfo(tInfo || {});
    } catch (err) {
      console.error('Error loading digital catalog data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  // Active products filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Must be active
      if (p.status === 'INACTIVE') return false;

      // Stock filter
      if (onlyInStock && Number(p.stock) <= 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q);
        const matchModel = p.model?.toLowerCase().includes(q);
        const matchCode = p.code?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchModel && !matchCode) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        if (p.category !== selectedCategory && p.categoryId !== selectedCategory) {
          return false;
        }
      }

      // Brand filter
      if (selectedBrand !== 'ALL') {
        if (p.brand !== selectedBrand && p.brandId !== selectedBrand) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, onlyInStock]);

  // Handle WhatsApp Share for single product
  const handleOpenWhatsAppSingle = (product: Product) => {
    setWhatsappTargetProduct(product);
    setIsWhatsAppModalOpen(true);
  };

  // Handle WhatsApp Share for full catalog
  const handleOpenWhatsAppCatalog = () => {
    setWhatsappTargetProduct(null);
    setIsWhatsAppModalOpen(true);
  };

  // Handle PDF Flyer Download
  const handleExportPdf = async (product: Product) => {
    Swal.fire({
      title: 'Generando Flyer PDF...',
      text: `Diseñando ficha técnica en alta resolución para ${product.name}`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await exportProductFlyerPdf(product, tenantInfo, exchangeRate);
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: '¡Flyer Generado!',
        text: 'El archivo PDF se ha descargado correctamente en tu equipo.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar el flyer PDF.',
      });
    }
  };

  // Switch to showcase on specific product from grid
  const handleViewInShowcase = (product: Product) => {
    const idx = filteredProducts.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      setCurrentShowcaseIndex(idx);
    }
    setViewMode('SHOWCASE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Sparkles size={20} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Catálogo Digital de Motocicletas
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Estilo SomosMoto
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            Showcase visual de alta gama para cotizar, mostrar modelos activos y compartir fichas técnicas por WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/catalog/showcase"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-md"
          >
            <ExternalLink size={15} className="text-cyan-400" />
            <span>Vista Cliente (Pública)</span>
          </a>

          <button
            onClick={handleOpenWhatsAppCatalog}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 hover:-translate-y-0.5"
          >
            <MessageCircle size={16} />
            <span>Enviar Catálogo por WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Category Chips, Brands, T/C and View Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por modelo, marca o código..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentShowcaseIndex(0);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Controls: Stock, T/C, View Mode */}
          <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-3">
            
            {/* Exchange Rate Input */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">T/C Dólar:</span>
              <span className="font-mono text-emerald-400 font-bold">S/</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 3.75)}
                className="w-14 bg-transparent border-none p-0 text-xs font-mono font-bold text-white focus:outline-none text-right"
              />
            </div>

            {/* In-Stock Only Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 border border-slate-700/80 px-3 py-2 rounded-xl cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => {
                  setOnlyInStock(e.target.checked);
                  setCurrentShowcaseIndex(0);
                }}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-slate-900 border-slate-700"
              />
              <span>Solo en Stock</span>
            </label>

            {/* View Mode Switcher */}
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('SHOWCASE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'SHOWCASE'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MonitorPlay size={14} />
                <span>Showcase SomosMoto</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'GRID'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid size={14} />
                <span>Galería ({filteredProducts.length})</span>
              </button>
            </div>

          </div>
        </div>

        {/* Category and Brand Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
            Categorías:
          </span>
          <button
            type="button"
            onClick={() => { setSelectedCategory('ALL'); setCurrentShowcaseIndex(0); }}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-amber-400 text-black font-bold'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            Todas ({products.filter(p => p.status !== 'INACTIVE').length})
          </button>
          {categories.map((c) => {
            const count = products.filter(p => p.status !== 'INACTIVE' && (p.category === c.name || p.categoryId === c.id)).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setSelectedCategory(c.name); setCurrentShowcaseIndex(0); }}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  selectedCategory === c.name
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                {c.name} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={28} className="animate-spin text-amber-400" />
          <span className="text-sm font-semibold">Cargando catálogo interactivo...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-16 text-center text-slate-400 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-bold text-white">No se encontraron motocicletas activas</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Prueba ajustando los filtros de búsqueda, categorías o marcas para explorar los productos registrados en el sistema.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedBrand('ALL');
              setOnlyInStock(false);
            }}
            className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : viewMode === 'SHOWCASE' ? (
        /* Showcase Hero View (SomosMoto Style) */
        <SomomotoHeroShowcase
          products={filteredProducts}
          currentIndex={currentShowcaseIndex < filteredProducts.length ? currentShowcaseIndex : 0}
          onSelectIndex={setCurrentShowcaseIndex}
          onOpenWhatsApp={handleOpenWhatsAppSingle}
          onExportPdf={handleExportPdf}
          exchangeRate={exchangeRate}
        />
      ) : (
        /* Grid Gallery View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p, idx) => {
            const usdPrice = p.price > 0 && exchangeRate > 0 ? Math.round(p.price / exchangeRate) : 0;
            return (
              <div
                key={p.id || idx}
                className="group rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                {/* Image & Badges Container */}
                <div className="relative h-60 bg-gradient-to-b from-slate-950 to-slate-900 p-6 flex items-center justify-center overflow-hidden">
                  {/* Brand Tag Top Left */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-white text-black font-black text-[10px] uppercase tracking-wider">
                      {p.brand}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {p.category}
                    </span>
                  </div>

                  {/* Stock Badge Top Right */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      Number(p.stock) > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      {Number(p.stock) > 0 ? `${p.stock} en stock` : 'Agotado'}
                    </span>
                  </div>

                  {/* Motorcycle Image */}
                  {p.imagePath ? (
                    <img
                      src={p.imagePath}
                      alt={p.name}
                      className="max-h-48 w-auto object-contain drop-shadow-[0_15px_20px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-slate-600 text-xs font-semibold flex flex-col items-center gap-2">
                      <Sparkles size={24} className="text-slate-700" />
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                      {p.model || p.brand}
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors">
                      {p.name}
                    </h3>
                  </div>

                  {/* Color Chips */}
                  {p.colors && p.colors.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Colores:</span>
                      {p.colors.slice(0, 4).map((c, cIdx) => (
                        <div
                          key={cIdx}
                          title={c.color}
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: c.hex || (cIdx === 0 ? '#fff' : '#000') }}
                        />
                      ))}
                      {p.colors.length > 4 && (
                        <span className="text-[10px] text-slate-500 font-mono">+{p.colors.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Pricing Box */}
                  <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Precio Contado</div>
                      <div className="text-2xl font-black text-white font-sans">
                        S/ {p.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {usdPrice > 0 && (
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Ref. Dólares</div>
                        <div className="text-xs font-bold text-amber-400 font-mono">
                          USD $ {usdPrice.toLocaleString('en-US')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleViewInShowcase(p)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                    >
                      <Eye size={14} className="text-amber-400" />
                      Showcase
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsAppSingle(p)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        product={whatsappTargetProduct}
        allProducts={products}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
