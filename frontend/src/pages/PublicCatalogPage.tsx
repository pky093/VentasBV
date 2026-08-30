import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles, MessageCircle, Phone, MapPin, Grid, 
  MonitorPlay, Search, ChevronRight, RefreshCw, X,
  ShieldCheck, Award, Zap, Fuel, Disc, Gauge, ExternalLink
} from 'lucide-react';
import { productsService, catalogService, settingsService, Product, Category } from '../lib/db-services';
import { SomomotoHeroShowcase } from '../components/catalog/SomomotoHeroShowcase';
import { exportProductFlyerPdf } from '../lib/catalog-flyer';

export default function PublicCatalogPage() {
  const [searchParams] = useSearchParams();
  const targetProductId = searchParams.get('p');

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
  }, []);

  const loadPublicData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats, tInfo] = await Promise.all([
        productsService.getProducts(),
        catalogService.getCategories(),
        settingsService.getTenantInfo(),
      ]);

      const activeList = (prods || []).filter(p => p.status !== 'INACTIVE');
      setProducts(activeList);
      setCategories(cats || []);
      setTenantInfo(tInfo || {});

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

  const dealerName = tenantInfo.trade_name || tenantInfo.name || 'VENTAS B&V';
  const dealerPhone = tenantInfo.phone || '999888777';
  const dealerAddress = tenantInfo.address || 'Av. Principal - Tienda Autorizada';

  // Trigger WhatsApp from Customer directly to Dealer
  const handleClientQuotationWhatsApp = (product: Product, selectedColor?: string) => {
    const rawPhone = dealerPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 9 ? `51${rawPhone}` : rawPhone || '51999888777';

    const usdPrice = product.price > 0 && exchangeRate > 0 ? Math.round(product.price / exchangeRate) : 0;
    
    let text = `¡Hola *${dealerName}*! 👋\n\n`;
    text += `Estoy visitando su *Catálogo Digital Oficial* y me interesa cotizar este modelo:\n\n`;
    text += `🏍️ *${product.brand?.toUpperCase()} ${product.name?.toUpperCase()}*\n`;
    if (selectedColor) {
      text += `🎨 *Color de Interés:* ${selectedColor}\n`;
    }
    text += `💰 *Precio:* S/ ${product.price.toLocaleString('es-PE', { minimumFractionDigits: 0 })}\n`;
    if (usdPrice > 0) {
      text += `💵 *Ref. USD:* $ ${usdPrice.toLocaleString('en-US')}\n`;
    }
    text += `\n¿Podrían brindarme información sobre disponibilidad, entrega y opciones de financiamiento? ¡Muchas gracias!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const handleExportPdf = (product: Product) => {
    exportProductFlyerPdf(product, tenantInfo, exchangeRate);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Top Navbar with Dynamic Company Name */}
      <header className="sticky top-0 z-50 bg-[#0c0e14]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-10 py-3">
        <div className="w-full flex items-center justify-between gap-6">
          
          {/* Left: Company Name Logo Badge */}
          <div className="flex items-center gap-3">
            <div className="border-2 border-white px-3 py-1 text-white font-black text-xs sm:text-sm md:text-base tracking-wider uppercase leading-none select-none flex items-center justify-center">
              <span>{dealerName}</span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <button
              onClick={() => { setSelectedCategory('ALL'); setCurrentShowcaseIndex(0); setViewMode('SHOWCASE'); }}
              className="text-white hover:text-yellow-400 transition-colors cursor-pointer"
            >
              Inicio
            </button>
            <button
              onClick={() => { setSelectedCategory('ALL'); setViewMode('GRID'); }}
              className={`hover:text-yellow-400 transition-colors cursor-pointer ${viewMode === 'GRID' ? 'text-yellow-400 font-black' : ''}`}
            >
              Catálogo de Motos
            </button>
            {categories.slice(0, 4).map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCategory(c.name); setCurrentShowcaseIndex(0); }}
                className={`hover:text-yellow-400 transition-colors cursor-pointer ${selectedCategory === c.name ? 'text-yellow-400 font-black' : ''}`}
              >
                {c.name}
              </button>
            ))}
          </nav>

          {/* Right: View Switcher + WhatsApp Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/40 border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('SHOWCASE')}
                className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'SHOWCASE'
                    ? 'bg-[#f3c623] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Showcase
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'GRID'
                    ? 'bg-[#f3c623] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Galería ({filteredProducts.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (products.length > 0) {
                  handleClientQuotationWhatsApp(products[currentShowcaseIndex] || products[0]);
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25d366] hover:bg-[#20bd5a] text-black font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              <MessageCircle size={14} className="fill-black" />
              <span>WhatsApp Asesor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        
        {/* Loading / Content */}
        {isLoading ? (
          <div className="p-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={36} className="animate-spin text-yellow-400" />
            <span className="text-sm font-semibold text-slate-300">Cargando catálogo {dealerName}...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-slate-400 bg-[#0d1117] border border-slate-800 m-6 space-y-3 shadow-xl">
            <p className="text-base text-white font-semibold">No se encontraron modelos con los filtros seleccionados.</p>
            <button
              onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
              className="mt-2 px-6 py-2.5 bg-[#f3c623] text-black font-extrabold text-xs uppercase tracking-wider shadow-lg cursor-pointer"
            >
              Ver todos los modelos
            </button>
          </div>
        ) : viewMode === 'SHOWCASE' ? (
          /* Exact SomosMoto Style Hero Showcase with Company Name and Spec Bubbles */
          <SomomotoHeroShowcase
            products={filteredProducts}
            currentIndex={currentShowcaseIndex < filteredProducts.length ? currentShowcaseIndex : 0}
            onSelectIndex={setCurrentShowcaseIndex}
            onOpenWhatsApp={handleClientQuotationWhatsApp}
            onExportPdf={handleExportPdf}
            exchangeRate={exchangeRate}
            isPublicView={true}
            companyName={dealerName}
          />
        ) : (
          /* Grid View for browsing all models */
          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto w-full">
            {filteredProducts.map((p, idx) => {
              const usdPrice = p.price > 0 && exchangeRate > 0 ? Math.round(p.price / exchangeRate) : 0;
              return (
                <div
                  key={p.id || idx}
                  className="group bg-[#0d1117] border border-white/10 hover:border-[#f3c623] overflow-hidden flex flex-col transition-all duration-300"
                >
                  <div className="relative h-64 bg-radial from-slate-800/40 via-[#0d1117] to-black p-6 flex items-center justify-center overflow-hidden">
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-2 py-0.5 bg-white text-black font-black text-[10px] uppercase tracking-wider">
                        {p.brand}
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

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-[#f3c623]">
                        {p.model || p.brand}
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        {p.name}
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Precio de Lista</div>
                        <div className="text-2xl font-black text-white font-sans">
                          S/ {p.price.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      {usdPrice > 0 && (
                        <div className="text-right">
                          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Ref. USD</div>
                          <div className="text-xs font-bold text-slate-300 font-mono">
                            $ {usdPrice.toLocaleString('en-US')}
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
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors text-center cursor-pointer"
                      >
                        Ver Showcase
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClientQuotationWhatsApp(p)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#f3c623] hover:bg-[#2563eb] text-black hover:text-white text-xs font-black transition-all cursor-pointer"
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
        )}

      </main>

      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            if (filteredProducts.length > 0) {
              handleClientQuotationWhatsApp(filteredProducts[currentShowcaseIndex] || filteredProducts[0]);
            }
          }}
          title="Cotizar por WhatsApp"
          className="w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-2xl shadow-emerald-950/80 hover:scale-110 active:scale-95 transition-all p-3 cursor-pointer"
        >
          <MessageCircle size={30} className="fill-white text-[#25d366]" />
        </button>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#07090e] py-6 px-4 text-center text-xs text-slate-500">
        <p className="max-w-md mx-auto mb-1 text-slate-400">
          <strong className="text-white">{dealerName}</strong> &bull; {dealerAddress}
        </p>
        <p>&copy; {new Date().getFullYear()} Catálogo Oficial. Precios sujetos a disponibilidad.</p>
      </footer>
    </div>
  );
}
