import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { 
  Sparkles, MessageCircle, Phone, MapPin, Grid, 
  MonitorPlay, Search, ChevronRight, RefreshCw, X,
  ShieldCheck, Award, Zap, Fuel, Disc, Gauge, ExternalLink,
  Instagram, Facebook, Youtube, Video
} from 'lucide-react';
import { productsService, catalogService, settingsService, tenantsService, Product, Category } from '../lib/db-services';
import { SomomotoHeroShowcase } from '../components/catalog/SomomotoHeroShowcase';
import { exportProductFlyerPdf } from '../lib/catalog-flyer';

export default function PublicCatalogPage() {
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const targetProductId = searchParams.get('p');
  const tenantQueryParam = searchParams.get('tenant') || searchParams.get('t') || searchParams.get('ruc') || searchParams.get('empresa');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'SHOWCASE' or 'GRID'
  const [viewMode, setViewMode] = useState<'SHOWCASE' | 'GRID'>('SHOWCASE');
  const [currentShowcaseIndex, setCurrentShowcaseIndex] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [exchangeRate, setExchangeRate] = useState<number>(3.75);

  useEffect(() => {
    loadPublicData();
  }, [tenantSlug, tenantQueryParam, targetProductId]);

  const loadPublicData = async () => {
    setIsLoading(true);
    try {
      const activeIdentifier = tenantSlug || tenantQueryParam;
      let targetTenantId: string | undefined = undefined;
      let resolvedTenantInfo: any = null;

      if (activeIdentifier) {
        const found = await tenantsService.getTenantBySlugOrIdentifier(activeIdentifier);
        if (found) {
          targetTenantId = found.id;
          resolvedTenantInfo = {
            id: found.id,
            name: found.name,
            trade_name: found.legalName || found.name,
            phone: found.phone,
            address: found.address,
            ruc: found.ruc,
          };
        }
      }

      const [prods, cats, tInfo] = await Promise.all([
        productsService.getProducts(undefined, targetTenantId),
        catalogService.getCategories(targetTenantId),
        settingsService.getTenantInfo(targetTenantId),
      ]);

      const activeList = (prods || []).filter(p => p.status !== 'INACTIVE');
      setProducts(activeList);
      setCategories(cats || []);
      setTenantInfo({
        ...(resolvedTenantInfo || {}),
        ...(tInfo || {}),
      });

      // If a specific product was requested via ?p=..., select it
      if (targetProductId) {
        const foundIdx = activeList.findIndex(p => p.id === targetProductId);
        if (foundIdx !== -1) {
          setCurrentShowcaseIndex(foundIdx);
          setViewMode('SHOWCASE');
        }
      }
    } catch (err) {
      console.error('Error loading public catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered active products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q);
        const matchModel = p.model?.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchModel) return false;
      }

      if (selectedCategory !== 'ALL') {
        if (p.category !== selectedCategory && p.categoryId !== selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  const dealerName = tenantInfo.trade_name || tenantInfo.name || 'CHINOS MOTORPARTS';
  const dealerPhone = tenantInfo.phone || '999888777';
  const dealerAddress = tenantInfo.address || 'Felix Aldão, La Esperanza, Perú';

  // Trigger WhatsApp from Customer directly to Dealer
  const handleClientQuotationWhatsApp = (product: Product, selectedColor?: string) => {
    const rawPhone = dealerPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 9 ? `51${rawPhone}` : rawPhone || '51999888777';

    const usdPrice = product.price > 0 && exchangeRate > 0 ? (product.price / exchangeRate).toFixed(2) : '0.00';
    
    let text = `¡Hola *${dealerName}*! 👋\n\n`;
    text += `Estoy visitando su *Catálogo Digital Oficial* y me interesa cotizar este modelo:\n\n`;
    text += `🏍️ *${product.brand?.toUpperCase()} ${product.name?.toUpperCase()}*\n`;
    if (selectedColor) {
      text += `🎨 *Color de Interés:* ${selectedColor}\n`;
    }
    text += `💰 *Precio:* S/ ${product.price.toLocaleString('es-PE', { minimumFractionDigits: 0 })}\n`;
    if (Number(usdPrice) > 0) {
      text += `💵 *Ref. USD:* $ ${usdPrice}\n`;
    }
    text += `\n¿Podrían brindarme información sobre disponibilidad, entrega y opciones de financiamiento? ¡Muchas gracias!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const handleExportPdf = (product: Product) => {
    exportProductFlyerPdf(product, tenantInfo, exchangeRate);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-[#f3c623] selection:text-black">
      
      {/* Top Navbar matching exact reference design header */}
      <header className="sticky top-0 z-50 bg-[#0c0f17]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-10 py-3">
        <div className="w-full max-w-[1650px] mx-auto flex items-center justify-between gap-4 sm:gap-6">
          
          {/* Left: Company / Dealer Logo Badge */}
          <div className="flex items-center gap-3">
            <div className="border-2 border-white px-3 py-1 text-white font-black text-xs sm:text-sm md:text-base tracking-wider uppercase leading-none select-none flex items-center justify-center">
              <span>{dealerName}</span>
            </div>
          </div>

          {/* Center Navigation Links with Active Gold Indicator */}
          <nav className="hidden lg:flex items-center gap-7 text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <button
              onClick={() => { setSelectedCategory('ALL'); setCurrentShowcaseIndex(0); setViewMode('SHOWCASE'); }}
              className="text-white hover:text-[#f3c623] transition-colors cursor-pointer"
            >
              Inicio
            </button>

            <button
              onClick={() => { setSelectedCategory('ALL'); setViewMode('GRID'); }}
              className={`hover:text-[#f3c623] transition-colors cursor-pointer relative py-1 ${
                viewMode === 'GRID' && selectedCategory === 'ALL'
                  ? 'text-[#f3c623] font-black after:content-[""] after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[2.5px] after:bg-[#f3c623]'
                  : ''
              }`}
            >
              Catálogo de Motos
            </button>

            {categories.slice(0, 4).map((c) => {
              const isActive = selectedCategory === c.name;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCategory(c.name); setCurrentShowcaseIndex(0); }}
                  className={`hover:text-[#f3c623] transition-colors cursor-pointer relative py-1 ${
                    isActive
                      ? 'text-[#f3c623] font-black after:content-[""] after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[2.5px] after:bg-[#f3c623]'
                      : 'text-slate-300'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </nav>

          {/* Right: Showcase & Gallery Pill Buttons + WhatsApp Asesor Button */}
          <div className="flex items-center gap-3">
            
            <button
              type="button"
              onClick={() => setViewMode('SHOWCASE')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all rounded-lg cursor-pointer ${
                viewMode === 'SHOWCASE'
                  ? 'bg-[#f3c623] text-black shadow-md shadow-yellow-500/20 border border-[#f3c623]'
                  : 'bg-white/5 text-slate-300 hover:text-white border border-white/10 hover:border-white/30'
              }`}
            >
              Showcase
            </button>

            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all rounded-lg cursor-pointer ${
                viewMode === 'GRID'
                  ? 'bg-[#f3c623] text-black shadow-md shadow-yellow-500/20 border border-[#f3c623]'
                  : 'bg-white/5 text-slate-300 hover:text-white border border-white/10 hover:border-white/30'
              }`}
            >
              <Grid size={13} />
              <span>Galería</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        
        {isLoading ? (
          <div className="p-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={36} className="animate-spin text-[#f3c623]" />
            <span className="text-sm font-semibold text-slate-300">Cargando catálogo {dealerName}...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-slate-400 bg-[#0d1117] border border-slate-800 m-6 space-y-3 shadow-xl rounded-2xl max-w-xl mx-auto">
            <p className="text-base text-white font-semibold">No se encontraron modelos con los filtros seleccionados.</p>
            <button
              onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
              className="mt-2 px-6 py-2.5 bg-[#f3c623] text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg cursor-pointer hover:bg-yellow-400"
            >
              Ver todos los modelos
            </button>
          </div>
        ) : viewMode === 'SHOWCASE' ? (
          (() => {
            const activePublicProduct = filteredProducts[currentShowcaseIndex < filteredProducts.length ? currentShowcaseIndex : 0];
            let activeConfig: any = {};
            if (activePublicProduct) {
              try {
                const cached = localStorage.getItem(`showcase_config_${activePublicProduct.id}`);
                if (cached) activeConfig = JSON.parse(cached);
              } catch (e) {}
            }

            const mergedProducts = filteredProducts.map((p) => {
              if (p.id === activePublicProduct?.id) {
                return {
                  ...p,
                  colors: (activeConfig.colors && activeConfig.colors.length > 0) ? activeConfig.colors : p.colors,
                  showcaseFeatures: activeConfig.features || (p as any).showcaseFeatures,
                  showcaseGlobes: activeConfig.globes || (p as any).showcaseGlobes,
                  primaryColor: activeConfig.primaryColor || (p as any).primaryColor,
                  galleryAngles: activeConfig.galleryAngles || (p as any).galleryAngles,
                  editorialDescription: activeConfig.editorialDescription || (p as any).editorialDescription || p.description,
                };
              }
              return p;
            });

            return (
              <SomomotoHeroShowcase
                products={mergedProducts}
                currentIndex={currentShowcaseIndex < filteredProducts.length ? currentShowcaseIndex : 0}
                onSelectIndex={setCurrentShowcaseIndex}
                onOpenWhatsApp={handleClientQuotationWhatsApp}
                onExportPdf={handleExportPdf}
                exchangeRate={exchangeRate}
                isPublicView={true}
                companyName={dealerName}
                primaryColor={activeConfig.primaryColor || (activePublicProduct as any)?.primaryColor || '#f3c623'}
                customFeatures={activeConfig.features || (activePublicProduct as any)?.showcaseFeatures}
                customGlobes={activeConfig.globes || (activePublicProduct as any)?.showcaseGlobes}
                customEditorialDescription={activeConfig.editorialDescription || (activePublicProduct as any)?.editorialDescription || (activePublicProduct as any)?.description}
                galleryAngles={activeConfig.galleryAngles || (activePublicProduct as any)?.galleryAngles}
              />
            );
          })()
        ) : (
          /* Grid Gallery View */
          <div className="p-6 sm:p-10 max-w-[1650px] mx-auto w-full space-y-6">
            
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0d1117] border border-white/10 rounded-2xl p-4">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar modelo o marca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f3c623]"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedCategory === 'ALL' ? 'bg-[#f3c623] text-black font-black' : 'bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  Todos ({products.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCategory === c.name ? 'bg-[#f3c623] text-black font-black' : 'bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((p, idx) => {
                const usdPrice = p.price > 0 && exchangeRate > 0 ? (p.price / exchangeRate).toFixed(2) : '0.00';
                return (
                  <div
                    key={p.id || idx}
                    className="group bg-[#0d1117] border border-white/10 hover:border-[#f3c623] rounded-2xl overflow-hidden flex flex-col transition-all duration-300 shadow-xl"
                  >
                    <div className="relative h-64 bg-radial from-slate-800/40 via-[#0d1117] to-black p-6 flex items-center justify-center overflow-hidden">
                      <div className="absolute top-4 left-4 z-10">
                        <span className="px-2.5 py-0.5 bg-[#f3c623] text-black font-black text-[10px] uppercase tracking-wider rounded">
                          {p.category || 'MOTO'}
                        </span>
                      </div>

                      {p.imagePath ? (
                        <img
                          src={p.imagePath}
                          alt={p.name}
                          className="max-h-52 w-auto object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="text-slate-600 text-xs font-semibold">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4 bg-[#090c12]">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-[#f3c623]">
                          {p.brand}
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">
                          {p.name}
                        </h3>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Precio Oficial</div>
                          <div className="text-2xl font-black text-white font-sans">
                            S/ {p.price.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        {Number(usdPrice) > 0 && (
                          <div className="text-right">
                            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Ref. USD</div>
                            <div className="text-xs font-bold text-slate-300 font-mono">
                              $ {usdPrice}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const fIdx = filteredProducts.findIndex(item => item.id === p.id);
                            if (fIdx !== -1) setCurrentShowcaseIndex(fIdx);
                            setViewMode('SHOWCASE');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold rounded-xl transition-colors text-center cursor-pointer border border-white/10"
                        >
                          Ver Showcase
                        </button>

                        <button
                          type="button"
                          onClick={() => handleClientQuotationWhatsApp(p)}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#f3c623] hover:bg-yellow-400 text-black text-xs font-black rounded-xl transition-all cursor-pointer shadow-md"
                        >
                          <MessageCircle size={14} />
                          Cotizar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </main>

      {/* Footer matching reference design (shown in Grid mode) */}
      {viewMode === 'GRID' && (
        <footer className="border-t border-white/10 bg-[#07090e] py-4 px-4 text-xs text-slate-400">
          <div className="max-w-[1650px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={14} className="text-[#f3c623] shrink-0" />
              <span><strong className="text-white">{dealerName}</strong> &bull; {dealerAddress}</span>
            </div>

            <div>
              <p>&copy; {new Date().getFullYear()} Catálogo Oficial. Precios sujetos a disponibilidad.</p>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <a href="#facebook" className="hover:text-[#f3c623] transition-colors"><Facebook size={16} /></a>
              <a href="#instagram" className="hover:text-[#f3c623] transition-colors"><Instagram size={16} /></a>
              <a href="#youtube" className="hover:text-[#f3c623] transition-colors"><Youtube size={16} /></a>
            </div>

          </div>
        </footer>
      )}
    </div>
  );
}
