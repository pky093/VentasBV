import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Share2, FileDown, MessageCircle, 
  Check, Gauge, Flame, Disc, Fuel, Zap, Settings, Eye
} from 'lucide-react';
import { Product } from '../../lib/db-services';
import { removeWhiteBackground } from '../../lib/image-cutout';
import { getMotorcycleSpecs, SpecBubble } from '../../lib/motorcycle-specs';
import { ShowcaseHeroButton } from '../ui/ShowcaseHeroButton';

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
  const [processedImage, setProcessedImage] = useState<string>('');
  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!products || products.length === 0) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center bg-[#11161f] text-slate-400 text-sm">
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
    onSelectIndex(currentIndex === 0 ? products.length - 1 : currentIndex - 1);
  };

  const handleNext = () => {
    setSelectedColorIndex(0);
    onSelectIndex(currentIndex === products.length - 1 ? 0 : currentIndex + 1);
  };

  const usdPrice = currentProduct.price > 0 && exchangeRate > 0
    ? Math.round(currentProduct.price / exchangeRate)
    : 0;

  // Extract model and brand display names
  const brandName = (currentProduct.brand || 'BAJAJ PULSAR').toUpperCase();
  const rawModelName = (currentProduct.model || currentProduct.name || 'NS 400').toUpperCase();
  const shortModelSlug = rawModelName.replace(brandName, '').trim() || rawModelName;

  // Color variants list
  const colorsList = currentProduct.colors && currentProduct.colors.length > 0
    ? currentProduct.colors
    : [
        { color: 'Rojo Racing', hex: '#dc2626', stock: 2 },
        { color: 'Negro Ébano', hex: '#111827', stock: 3 },
        { color: 'Blanco Perla', hex: '#ffffff', stock: 2 },
      ];

  const activeColor = colorsList[selectedColorIndex] || colorsList[0];

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

  // Helper icon for bubbles
  const renderBubbleIcon = (type: string) => {
    switch (type) {
      case 'displacement': return <Gauge size={13} className="text-amber-400" />;
      case 'power': return <Flame size={13} className="text-rose-400" />;
      case 'brakes': return <Disc size={13} className="text-cyan-400" />;
      case 'fuel': return <Fuel size={13} className="text-emerald-400" />;
      default: return <Zap size={13} className="text-yellow-400" />;
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-60px)] flex flex-col justify-between font-sans select-none overflow-hidden bg-[#0a0c10] text-white">
      
      {/* Hero Stage Area */}
      <div 
        className="relative w-full flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(10, 12, 16, 0.94) 0%, rgba(10, 12, 16, 0.60) 45%, rgba(10, 12, 16, 0.95) 100%),
            linear-gradient(to bottom, rgba(10, 12, 16, 0.3) 0%, rgba(10, 12, 16, 0.88) 100%),
            url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=85')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Top Breadcrumb & Utilities */}
        <div className="relative z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-normal text-slate-300">
            <span className="hover:text-white cursor-pointer transition-colors">Catálogo</span>
            <span className="text-slate-500">/</span>
            <span className="hover:text-white cursor-pointer transition-colors">{currentProduct.category || 'Motos'}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-200 font-semibold">{currentProduct.brand}</span>
          </div>

          <div className="flex items-center gap-2">
            {onExportPdf && (
              <button
                type="button"
                onClick={() => onExportPdf(currentProduct)}
                title="Descargar Ficha Técnica PDF"
                className="w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-primary-600 border border-white/20 hover:border-primary-400 text-white transition-all cursor-pointer"
              >
                <FileDown size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              title="Compartir enlace"
              className="w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-primary-600 border border-white/20 hover:border-primary-400 text-white transition-all cursor-pointer"
            >
              {copiedLink ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
            </button>

            <button
              type="button"
              onClick={() => onOpenWhatsApp(currentProduct, activeColor.color)}
              title="Contactar Asesor"
              className="w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-emerald-600 border border-white/20 hover:border-emerald-400 text-white transition-all cursor-pointer"
            >
              <MessageCircle size={15} />
            </button>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout: Left Bike Stage | Right Editorial Info */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center my-auto py-2">
          
          {/* LEFT: Giant Watermark Title + Extra-Large Motorcycle Cutout + Dynamic Spec Bubbles */}
          <div className="lg:col-span-7 flex flex-col justify-center relative min-h-[360px] md:min-h-[460px] lg:min-h-[520px]">
            
            {/* Display Title on Top Left */}
            <div className="space-y-0 select-none z-0">
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-300">
                {brandName}
              </div>
              <div className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] font-black uppercase tracking-tight text-white leading-none font-sans drop-shadow-md">
                {shortModelSlug}
              </div>
            </div>

            {/* Extra Large Motorcycle Image Cutout */}
            <div className="relative z-10 flex items-center justify-center mt-[-15px] sm:mt-[-30px] group">
              {processedImage || currentProduct.imagePath ? (
                <div className="relative flex flex-col items-center w-full">
                  <img
                    src={processedImage || currentProduct.imagePath}
                    alt={currentProduct.name}
                    className="max-h-[320px] sm:max-h-[420px] md:max-h-[500px] lg:max-h-[560px] xl:max-h-[620px] w-auto max-w-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.95)] transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {/* Floor Shadow */}
                  <div className="w-[85%] h-6 bg-black/90 blur-xl rounded-full mt-[-10px] pointer-events-none" />
                </div>
              ) : (
                <div className="w-80 h-56 flex items-center justify-center text-slate-500 text-xs">
                  (Imagen no disponible)
                </div>
              )}
            </div>

            {/* Configurable Dynamic Spec Bubbles (Floating modern glass capsules) */}
            <div className="relative z-20 flex flex-wrap items-center gap-2 pt-3">
              {specs.bubbles.map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-semibold shadow-lg transition-all hover:scale-105 ${
                    b.highlight
                      ? 'bg-yellow-400/20 border border-yellow-400/40 text-yellow-300'
                      : 'bg-black/60 border border-white/15 text-slate-200 hover:bg-black/80 hover:border-white/30'
                  }`}
                >
                  {renderBubbleIcon(b.iconType)}
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{b.label}:</span>
                  <span className="font-extrabold text-white font-mono">{b.value}</span>
                </div>
              ))}
            </div>

            {/* Carousel Navigation Arrows */}
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between pointer-events-none px-1">
              <button
                type="button"
                onClick={handlePrev}
                className="pointer-events-auto p-3 rounded-full bg-black/70 hover:bg-[#f3c623] text-slate-300 hover:text-black border border-white/20 transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="pointer-events-auto p-3 rounded-full bg-black/70 hover:bg-[#f3c623] text-slate-300 hover:text-black border border-white/20 transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
                title="Siguiente"
              >
                <ChevronRight size={20} />
              </button>
            </div>

          </div>

          {/* RIGHT: Model Header, Editorial Description, Pricing & Big Hero Button */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-5 relative z-10 lg:pl-4 text-right sm:text-right lg:text-right">
            
            {/* Header: Model & Year */}
            <div className="space-y-0.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {brandName}
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white">
                {currentProduct.name}
              </h2>
              <div className="text-xs font-bold text-slate-400 font-mono">
                EDICIÓN 2026
              </div>
            </div>

            {/* Editorial Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              {currentProduct.model
                ? `La nueva ${currentProduct.brand} ${currentProduct.model} no solo tiene un motor potente con tecnología de vanguardia, sino que viene equipada con frenado ${specs.brakes}, inyección ${specs.fuelSystem} y suspensión de alta estabilidad para máximo desempeño y confort en ciudad y carretera.`
                : `Motocicleta de alta gama con ingeniería de vanguardia, excelente rendimiento de combustible y un diseño imponente listo para dominar cualquier ruta.`}
            </p>

            {/* Pricing Presentation */}
            <div className="space-y-1 pt-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                PRECIO REFERENCIAL PARA TIENDA
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500">
                (PRECIO VÁLIDO HOY {new Date().toLocaleDateString('es-PE')} Y/O HASTA AGOTAR STOCK)
              </div>

              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight font-sans pt-1">
                S/ {currentProduct.price.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>

              {usdPrice > 0 && (
                <div className="text-xs font-semibold text-slate-300 font-mono">
                  USD $ {usdPrice.toLocaleString('en-US')} * <span className="text-[10px] text-slate-500 font-normal">T/C {exchangeRate.toFixed(2)} (REFERENCIAL)</span>
                </div>
              )}
            </div>

            {/* Big Prominent Hero Button with Primary Color Hover Glow */}
            <div className="pt-2 flex justify-end">
              <ShowcaseHeroButton
                variant="primary"
                size="lg"
                icon={<MessageCircle size={18} />}
                onClick={() => onOpenWhatsApp(currentProduct, activeColor.color)}
                className="w-full sm:w-auto shadow-xl"
              >
                QUIERO ESTA MOTO
              </ShowcaseHeroButton>
            </div>

          </div>

        </div>

      </div>

      {/* Bottom Bar: Square Color Swatches + Model Quick Switcher */}
      <div className="relative z-20 w-full bg-white px-4 sm:px-8 lg:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 text-black">
        
        {/* Models Navigator Info */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
            Modelo {currentIndex + 1} de {products.length}
          </span>
          <div className="hidden sm:flex items-center gap-2">
            {products.map((p, idx) => (
              <button
                key={p.id || idx}
                type="button"
                onClick={() => {
                  setSelectedColorIndex(0);
                  onSelectIndex(idx);
                }}
                className={`text-xs font-semibold px-2.5 py-1 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'border-b-2 border-black text-black font-black'
                    : 'text-slate-500 hover:text-black'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Square Color Swatches */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-700">
            COLORES
          </span>

          <div className="flex items-center gap-2">
            {colorsList.map((c, idx) => {
              const isSelected = selectedColorIndex === idx;
              const isWhite = c.hex === '#ffffff' || c.hex === '#f8fafc' || c.color.toLowerCase().includes('blanco');
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedColorIndex(idx)}
                  title={`${c.color} (${c.stock ?? 1} disponibles)`}
                  className={`w-7 h-7 flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-black ring-offset-2 scale-105'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: c.hex || (idx === 0 ? '#dc2626' : idx === 1 ? '#111827' : '#ffffff'),
                    border: isWhite ? '1px solid #cbd5e1' : '1px solid transparent',
                  }}
                >
                  {isSelected && (
                    <Check size={13} className={isWhite ? 'text-black' : 'text-white'} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
