import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Share2, FileDown, MessageCircle, 
  Check, Gauge, Flame, Disc, Fuel, Zap, ShieldCheck, Shield, Award, 
  ShoppingCart, Truck, Wrench, CreditCard, RotateCw, Sparkles, Sliders
} from 'lucide-react';
import { Product } from '../../lib/db-services';
import { removeWhiteBackground } from '../../lib/image-cutout';
import { getMotorcycleSpecs } from '../../lib/motorcycle-specs';

interface SomomotoHeroShowcaseProps {
  products: Product[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenWhatsApp: (product: Product, selectedColor?: string) => void;
  onExportPdf?: (product: Product) => void;
  exchangeRate?: number;
  isPublicView?: boolean;
  companyName?: string;
}

export const SomomotoHeroShowcase: React.FC<SomomotoHeroShowcaseProps> = ({
  products,
  currentIndex,
  onSelectIndex,
  onOpenWhatsApp,
  onExportPdf,
  exchangeRate = 3.75,
  companyName = 'VENTAS B&V',
}) => {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [selectedAngleIndex, setSelectedAngleIndex] = useState<number>(0);
  const [processedImage, setProcessedImage] = useState<string>('');
  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!products || products.length === 0) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center bg-[#07090e] text-slate-400 text-sm">
        No hay modelos disponibles en el catálogo.
      </div>
    );
  }

  const currentProduct = products[currentIndex] || products[0];

  // Dynamic & Configurable Specs
  const specs = useMemo(() => {
    return getMotorcycleSpecs(
      currentProduct.name,
      currentProduct.brand,
      currentProduct.model,
      currentProduct.category,
      (currentProduct as any).specs || (currentProduct as any).technicalSpecs
    );
  }, [currentProduct]);

  // Color variants list
  const colorsList = currentProduct.colors && currentProduct.colors.length > 0
    ? currentProduct.colors
    : [
        { color: 'Negro Ébano', hex: '#111827', stock: 3 },
        { color: 'Rojo Racing', hex: '#dc2626', stock: 2 },
        { color: 'Blanco Perla', hex: '#f8fafc', stock: 2 },
      ];

  const activeColor = colorsList[selectedColorIndex] || colorsList[0];

  // Process image with background cutout
  useEffect(() => {
    let isCancelled = false;
    if (currentProduct?.imagePath) {
      setIsProcessingImg(true);
      removeWhiteBackground(currentProduct.imagePath)
        .then((cutout) => {
          if (!isCancelled) {
            setProcessedImage(cutout);
            setIsProcessingImg(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setProcessedImage(currentProduct.imagePath || '');
            setIsProcessingImg(false);
          }
        });
    } else {
      setProcessedImage('');
      setIsProcessingImg(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [currentProduct?.imagePath]);

  // Keyboard navigation (Left / Right keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, products.length]);

  const handlePrev = () => {
    setSelectedColorIndex(0);
    setSelectedAngleIndex(0);
    onSelectIndex(currentIndex === 0 ? products.length - 1 : currentIndex - 1);
  };

  const handleNext = () => {
    setSelectedColorIndex(0);
    setSelectedAngleIndex(0);
    onSelectIndex(currentIndex === products.length - 1 ? 0 : currentIndex + 1);
  };

  const usdPrice = currentProduct.price > 0 && exchangeRate > 0
    ? (currentProduct.price / exchangeRate).toFixed(2)
    : '0.00';

  // Extract model and brand display names
  const categoryBadge = (currentProduct.category || 'MOTOCICLETAS').toUpperCase();
  const brandDisplay = (currentProduct.brand || 'BAJAJ PULSAR').toUpperCase();
  const rawModelName = (currentProduct.model || currentProduct.name || 'NS 400').toUpperCase();
  const shortModelSlug = rawModelName.replace(brandDisplay, '').trim() || rawModelName;

  // Key feature cards for the 4-box highlight row
  const keyFeatures = [
    {
      id: 'feature-1',
      title: 'AGARRE SUPERIOR',
      desc: 'Máxima tracción',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: 'feature-2',
      title: 'DISEÑO ANTIDESLIZANTE',
      desc: 'Control ergonómico',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'feature-3',
      title: 'MÁXIMA DURABILIDAD',
      desc: 'Resistencia probada',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: 'feature-4',
      title: 'ERGONOMÍA PERFECTA',
      desc: 'Confort en marcha',
      icon: (
        <svg className="w-5 h-5 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
    },
  ];

  const handleShare = async () => {
    const url = `${window.location.origin}/catalog/showcase?p=${currentProduct.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentProduct.brand} ${currentProduct.name}`,
          text: `Mira esta motocicleta ${currentProduct.brand} ${currentProduct.name} en ${companyName}:`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Gallery angles/thumbnails (using product image, color variations, or stylized fallback angles)
  const angleThumbnails = [
    { id: 0, label: 'Vista Principal', is360: true, img: processedImage || currentProduct.imagePath },
    { id: 1, label: 'Detalle Lateral', is360: false, img: processedImage || currentProduct.imagePath },
    { id: 2, label: 'Detalle Premium', is360: false, img: processedImage || currentProduct.imagePath },
  ];

  return (
    <div className="relative w-full min-h-screen bg-[#07090e] text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* Background Ambience / Industrial Workshop Lighting */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 55% 42%, rgba(243, 198, 35, 0.12) 0%, rgba(12, 16, 24, 0.6) 40%, rgba(7, 9, 14, 0.98) 75%),
            linear-gradient(to bottom, rgba(7, 9, 14, 0.85) 0%, rgba(7, 9, 14, 0.95) 100%),
            url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Main Hero Container */}
      <div className="relative z-10 w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-6 flex-1 flex flex-col justify-between">
        
        {/* Top Utility Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="hover:text-white cursor-pointer transition-colors">Catálogo Oficial</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#f3c623] font-bold">{categoryBadge}</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">{currentProduct.brand}</span>
          </div>

          <div className="flex items-center gap-2">
            {onExportPdf && (
              <button
                type="button"
                onClick={() => onExportPdf(currentProduct)}
                title="Descargar Ficha Técnica PDF"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#f3c623] text-slate-300 hover:text-black border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                <FileDown size={14} />
                <span className="hidden sm:inline">Ficha PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              title="Compartir enlace"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#f3c623] text-slate-300 hover:text-black border border-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Compartir'}</span>
            </button>
          </div>
        </div>

        {/* Central Grid Layout: Editorial Info (Left) | Hero Product Cutout + HUD Rings (Center) | Angle Thumbnails (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-4">
          
          {/* LEFT COLUMN: Category Badge, Dual Hero Title, Editorial Description, 4 Feature Cards */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col justify-center space-y-4 sm:space-y-5 z-20">
            
            {/* Category Pill Badge */}
            <div>
              <span className="inline-block px-3.5 py-1 bg-[#f3c623] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider rounded-md shadow-lg shadow-yellow-500/20">
                {categoryBadge}
              </span>
            </div>

            {/* Dual Hero Title */}
            <div className="space-y-0 select-none">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black uppercase text-white tracking-tight leading-none drop-shadow-md">
                {brandDisplay}
              </h1>
              <div className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-black uppercase text-[#f3c623] tracking-tight leading-none drop-shadow-[0_4px_20px_rgba(243,198,35,0.4)]">
                {shortModelSlug}
              </div>
            </div>

            {/* Editorial Description with Bold Accents */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light pr-2">
              {currentProduct.model ? (
                <>
                  La nueva {companyName} <strong className="text-white font-bold">{currentProduct.brand} {currentProduct.model}</strong> no solo tiene un motor potente con tecnología de vanguardia, sino que viene equipada con frenado <strong className="text-white font-bold">{specs.brakes}</strong>, <strong className="text-white font-bold">{specs.fuelSystem}</strong> y suspensión de alta estabilidad para máximo desempeño y confort en ciudad y carretera.
                </>
              ) : (
                <>
                  Diseño de ingeniería de vanguardia con acabados premium, máxima durabilidad y componentes de alta gama listos para dominar cualquier ruta y entregar la mejor experiencia de conducción.
                </>
              )}
            </p>

            {/* 4 Key Feature Highlight Cards (Exact match to reference image) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 pt-2">
              {keyFeatures.map((f) => (
                <div 
                  key={f.id}
                  className="flex flex-col items-center justify-center text-center p-2.5 rounded-xl bg-black/40 border border-[#f3c623]/30 hover:border-[#f3c623] hover:bg-[#f3c623]/10 transition-all duration-300 group cursor-default shadow-lg backdrop-blur-sm"
                >
                  <div className="p-2 rounded-lg bg-[#f3c623]/10 border border-[#f3c623]/40 group-hover:scale-110 transition-transform mb-1.5">
                    {f.icon}
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-tight leading-tight">
                    {f.title}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* CENTER STAGE: Tech HUD Orbital Rings + Giant Product Image Cutout + Floor Shadow */}
          <div className="lg:col-span-6 xl:col-span-6 relative flex items-center justify-center min-h-[340px] sm:min-h-[440px] md:min-h-[500px] lg:min-h-[520px]">
            
            {/* Tech HUD Concentric Circular Rings (Golden Orbital Accents) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Outer Dashed Orbit */}
              <div className="w-[340px] sm:w-[460px] md:w-[540px] lg:w-[580px] h-[340px] sm:h-[460px] md:h-[540px] lg:h-[580px] rounded-full border border-[#f3c623]/20 border-dashed animate-[spin_60s_linear_infinite]" />
              {/* Middle Glow Ring */}
              <div className="absolute w-[270px] sm:w-[380px] md:w-[440px] lg:w-[480px] h-[270px] sm:h-[380px] md:h-[440px] lg:h-[480px] rounded-full border-2 border-[#f3c623]/30 shadow-[0_0_50px_rgba(243,198,35,0.15)]" />
              {/* Inner HUD Tech Tick Marks */}
              <div className="absolute w-[200px] sm:w-[280px] md:w-[320px] lg:w-[360px] h-[200px] sm:h-[280px] md:h-[320px] lg:h-[360px] rounded-full border border-[#f3c623]/25" />
            </div>

            {/* Main Product Cutout Image */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 group">
              {processedImage || currentProduct.imagePath ? (
                <div className="relative flex flex-col items-center">
                  <img
                    src={processedImage || currentProduct.imagePath}
                    alt={currentProduct.name}
                    className="max-h-[320px] sm:max-h-[420px] md:max-h-[480px] lg:max-h-[520px] xl:max-h-[560px] w-auto max-w-full object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.95)] transition-all duration-500 group-hover:scale-105"
                  />
                  {/* Environmental Floor Shadow */}
                  <div className="w-[80%] h-7 bg-black/90 blur-xl rounded-full mt-[-15px] pointer-events-none" />
                </div>
              ) : (
                <div className="w-80 h-56 flex items-center justify-center text-slate-500 text-xs border border-white/10 rounded-2xl bg-black/40">
                  (Imagen no disponible)
                </div>
              )}
            </div>

            {/* Carousel Navigation Arrows */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-2 z-20">
              <button
                type="button"
                onClick={handlePrev}
                className="pointer-events-auto p-3 rounded-full bg-black/70 hover:bg-[#f3c623] text-slate-300 hover:text-black border border-white/20 transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
                title="Modelo Anterior"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="pointer-events-auto p-3 rounded-full bg-black/70 hover:bg-[#f3c623] text-slate-300 hover:text-black border border-white/20 transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
                title="Siguiente Modelo"
              >
                <ChevronRight size={20} />
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Vertical Angle / View Selector with 360 Badge */}
          <div className="lg:col-span-2 xl:col-span-2 flex flex-row lg:flex-col items-center justify-center gap-3 z-20">
            
            <button
              type="button"
              onClick={() => setSelectedAngleIndex((prev) => (prev > 0 ? prev - 1 : angleThumbnails.length - 1))}
              className="hidden lg:flex p-1 text-slate-400 hover:text-[#f3c623] transition-colors cursor-pointer"
              title="Ángulo anterior"
            >
              <ChevronUp size={22} />
            </button>

            {angleThumbnails.map((thumb, idx) => {
              const isSelected = selectedAngleIndex === idx;
              return (
                <button
                  key={thumb.id}
                  type="button"
                  onClick={() => setSelectedAngleIndex(idx)}
                  className={`relative w-24 sm:w-28 lg:w-32 h-20 sm:h-24 lg:h-26 rounded-xl bg-black/80 border p-2 flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-[#f3c623] ring-2 ring-[#f3c623]/60 shadow-[0_0_20px_rgba(243,198,35,0.4)] scale-105'
                      : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                  }`}
                >
                  {thumb.is360 && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-[#f3c623] text-black font-black text-[9px] rounded uppercase tracking-wider flex items-center gap-0.5 shadow">
                      <RotateCw size={9} /> 360°
                    </span>
                  )}
                  {thumb.img ? (
                    <img 
                      src={thumb.img} 
                      alt={thumb.label} 
                      className="max-h-full w-auto object-contain drop-shadow" 
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500">Vista {idx + 1}</span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedAngleIndex((prev) => (prev < angleThumbnails.length - 1 ? prev + 1 : 0))}
              className="hidden lg:flex p-1 text-slate-400 hover:text-[#f3c623] transition-colors cursor-pointer"
              title="Siguiente ángulo"
            >
              <ChevronDown size={22} />
            </button>

          </div>

        </div>

        {/* BOTTOM SECTION: Floating Telemetry Specs & Purchase Dock */}
        <div className="relative z-20 w-full mt-4">
          <div className="bg-[#0b0e14]/95 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Left: 4 Circular Technical Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full lg:w-auto flex-1">
              
              {/* Spec 1: Cilindrada */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <svg className="w-6 h-6 text-[#f3c623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CILINDRADA</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.displacement}</span>
                </div>
              </div>

              {/* Spec 2: Potencia */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <Gauge className="w-6 h-6 text-[#f3c623]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">POTENCIA</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.power.split('@')[0].trim()}</span>
                </div>
              </div>

              {/* Spec 3: Frenos */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <Disc className="w-6 h-6 text-[#f3c623]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">FRENOS</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.brakes.includes('ABS') ? 'ABS DOBLE CANAL' : 'DOBLE DISCO'}</span>
                </div>
              </div>

              {/* Spec 4: Sistema / Inyección */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-[#f3c623]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,198,35,0.15)]">
                  <Zap className="w-6 h-6 text-[#f3c623]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">SISTEMA</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{specs.fuelSystem.toUpperCase()}</span>
                </div>
              </div>

            </div>

            {/* Right: Edition, Price, and Big Conversion Hero Button */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8">
              
              <div className="space-y-0.5 text-left lg:text-right">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#f3c623]">
                  EDICIÓN 2026
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans">
                  S/ {currentProduct.price.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 font-mono">
                  USD $ {usdPrice} <span className="text-[10px] text-slate-500 font-normal">(REFERENCIAL)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenWhatsApp(currentProduct, activeColor.color)}
                className="w-full sm:w-auto px-8 py-4 bg-[#f3c623] hover:bg-[#e5b719] active:scale-95 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-[0_10px_30px_rgba(243,198,35,0.35)] transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <ShoppingCart size={20} className="stroke-[2.5] group-hover:scale-110 transition-transform" />
                <span>QUIERO ESTA MOTO</span>
              </button>

            </div>

          </div>
        </div>

        {/* BOTTOM TRUST & GUARANTEES BAR */}
        <div className="relative z-20 w-full pt-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 mt-4">
          
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <Truck size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">ENVÍOS A TODO EL PERÚ</div>
              <div className="text-[11px] text-slate-400 font-light">Rápidos y seguros</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">GARANTÍA CERTIFICADA</div>
              <div className="text-[11px] text-slate-400 font-light">Calidad garantizada</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <Wrench size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">SOPORTE TÉCNICO</div>
              <div className="text-[11px] text-slate-400 font-light">Asesoría especializada</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-black/40 border border-[#f3c623]/30 text-[#f3c623]">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-tight">PAGOS SEGUROS</div>
              <div className="text-[11px] text-slate-400 font-light">100% protegidos</div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
