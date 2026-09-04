import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Share2, FileDown, MessageCircle, 
  Check, Gauge, Flame, Disc, Fuel, Zap, RotateCw, Shield, Award,
  Sliders, Layers, Sparkles, Sun, ShieldCheck, Wrench, Grid
} from 'lucide-react';
import { Product } from '../../lib/db-services';
import { removeWhiteBackground } from '../../lib/image-cutout';
import { getMotorcycleSpecs } from '../../lib/motorcycle-specs';

export interface ShowcaseFeatureItem {
  id: string;
  title: string;
  desc?: string;
  icon: string;
}

export interface ShowcaseGlobeItem {
  id: string;
  label: string;
  value: string;
  icon: string;
}

interface SomomotoHeroShowcaseProps {
  products: Product[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenWhatsApp: (product: Product, selectedColor?: string) => void;
  onExportPdf?: (product: Product) => void;
  exchangeRate?: number;
  isPublicView?: boolean;
  companyName?: string;
  primaryColor?: string;
  customFeatures?: ShowcaseFeatureItem[];
  customGlobes?: ShowcaseGlobeItem[];
  customEditorialDescription?: string;
  galleryAngles?: Array<{ id: number; label: string; is360: boolean; img: string }>;
}

export const SomomotoHeroShowcase: React.FC<SomomotoHeroShowcaseProps> = ({
  products,
  currentIndex,
  onSelectIndex,
  onOpenWhatsApp,
  onExportPdf,
  exchangeRate = 3.75,
  companyName = 'VENTAS B&V',
  primaryColor = '#f3c623',
  customFeatures,
  customGlobes,
  customEditorialDescription,
  galleryAngles,
}) => {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [selectedAngleIndex, setSelectedAngleIndex] = useState<number>(0);
  const [processedImage, setProcessedImage] = useState<string>('');
  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!products || products.length === 0) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center bg-[#07090e] text-slate-400 text-sm">
        No hay modelos disponibles en el catálogo.
      </div>
    );
  }

  const currentProduct = products[currentIndex] || products[0];

  // Dynamic Specs
  const specs = useMemo(() => {
    return getMotorcycleSpecs(
      currentProduct.name,
      currentProduct.brand,
      currentProduct.model,
      currentProduct.category,
      (currentProduct as any).specs || (currentProduct as any).technicalSpecs
    );
  }, [currentProduct]);

  // Color variants list (supports individual image per color)
  const colorsList = currentProduct.colors && currentProduct.colors.length > 0
    ? currentProduct.colors
    : [
        { color: 'Negro Ébano', hex: '#111827', stock: 3, imagePath: currentProduct.imagePath },
        { color: 'Rojo Racing', hex: '#dc2626', stock: 2, imagePath: currentProduct.imagePath },
        { color: 'Blanco Perla', hex: '#f8fafc', stock: 2, imagePath: currentProduct.imagePath },
      ];

  const activeColor = colorsList[selectedColorIndex] || colorsList[0];

  const angleThumbnails = useMemo(() => {
    // 1. If the selected color has its own gallery angles with images:
    if (activeColor?.galleryAngles && Array.isArray(activeColor.galleryAngles) && activeColor.galleryAngles.length > 0) {
      const hasValid = activeColor.galleryAngles.some(a => a.img && a.img.trim().length > 0);
      if (hasValid) {
        return activeColor.galleryAngles.map((a, i) => ({
          id: i,
          label: a.label || (i === 0 ? 'Vista Principal' : i === 1 ? 'Detalle Lateral' : 'Detalle Chasis'),
          is360: a.is360 ?? (i === 0),
          img: a.img || activeColor.imagePath || ''
        }));
      }
    }

    // 2. If the active color has a specific main imagePath:
    if (activeColor?.imagePath && activeColor.imagePath.trim().length > 0) {
      return [
        { id: 0, label: 'Vista Principal', is360: true, img: activeColor.imagePath },
        { id: 1, label: 'Detalle Lateral', is360: false, img: activeColor.imagePath },
        { id: 2, label: 'Detalle Chasis', is360: false, img: activeColor.imagePath },
      ];
    }

    // 3. If on default color index 0 and galleryAngles prop was provided:
    if (selectedColorIndex === 0 && galleryAngles && galleryAngles.length > 0) {
      return galleryAngles;
    }

    // 4. Default fallback:
    return [
      { id: 0, label: 'Vista Principal', is360: true, img: currentProduct.imagePath || '' },
      { id: 1, label: 'Detalle Lateral', is360: false, img: currentProduct.imagePath || '' },
      { id: 2, label: 'Detalle Chasis', is360: false, img: currentProduct.imagePath || '' },
    ];
  }, [galleryAngles, currentProduct, activeColor, selectedColorIndex]);

  // Dynamic active image path based on selected angle thumbnail or selected color
  const activeImagePath = useMemo(() => {
    const selectedThumb = angleThumbnails[selectedAngleIndex];
    if (selectedThumb?.img && selectedThumb.img.trim()) {
      return selectedThumb.img;
    }
    return activeColor?.imagePath || (activeColor as any)?.img || currentProduct.imagePath || '';
  }, [angleThumbnails, selectedAngleIndex, activeColor, currentProduct]);

  // Process image with background cutout
  useEffect(() => {
    let isCancelled = false;
    if (activeImagePath) {
      setIsProcessingImg(true);
      removeWhiteBackground(activeImagePath)
        .then((cutout) => {
          if (!isCancelled) {
            setProcessedImage(cutout);
            setIsProcessingImg(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setProcessedImage(activeImagePath || '');
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
  }, [activeImagePath]);

  // Keyboard navigation for photos/angles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [angleThumbnails.length]);

  const handlePrev = () => {
    if (angleThumbnails.length > 0) {
      setSelectedAngleIndex((prev) => (prev === 0 ? angleThumbnails.length - 1 : prev - 1));
    }
  };

  const handleNext = () => {
    if (angleThumbnails.length > 0) {
      setSelectedAngleIndex((prev) => (prev === angleThumbnails.length - 1 ? 0 : prev + 1));
    }
  };

  const usdPrice = currentProduct.price > 0 && exchangeRate > 0
    ? (currentProduct.price / exchangeRate).toFixed(2)
    : '0.00';

  const categoryBadge = (currentProduct.category || 'MOTOCICLETAS').toUpperCase();
  const brandDisplay = (currentProduct.brand || 'BAJAJ PULSAR').toUpperCase();
  const rawModelName = (currentProduct.model || currentProduct.name || 'NS 400').toUpperCase();
  const shortModelSlug = rawModelName.replace(brandDisplay, '').trim() || rawModelName;

  const renderIcon = (iconName: string) => {
    const className = "w-3.5 h-3.5";
    switch (iconName?.toLowerCase()) {
      case 'shield':
      case 'escudo':
        return <Shield className={className} style={{ color: primaryColor }} />;
      case 'award':
      case 'garantia':
      case 'premio':
        return <Award className={className} style={{ color: primaryColor }} />;
      case 'flame':
      case 'fuego':
        return <Flame className={className} style={{ color: primaryColor }} />;
      case 'layers':
      case 'capas':
        return <Layers className={className} style={{ color: primaryColor }} />;
      case 'sliders':
      case 'ajuste':
      case 'ergonomics':
      case 'ergonomia':
        return <Sliders className={className} style={{ color: primaryColor }} />;
      case 'sun':
      case 'brillo':
        return <Sun className={className} style={{ color: primaryColor }} />;
      case 'sparkles':
        return <Sparkles className={className} style={{ color: primaryColor }} />;
      case 'gauge':
        return <Gauge className={className} style={{ color: primaryColor }} />;
      case 'grid':
      case 'diseno':
        return <Grid className={className} style={{ color: primaryColor }} />;
      case 'zap':
      case 'rayo':
      default:
        return <Zap className={className} style={{ color: primaryColor }} />;
    }
  };

  const renderGlobeIcon = (iconName: string) => {
    const className = "w-4 h-4";
    switch (iconName?.toLowerCase()) {
      case 'power':
      case 'potencia':
      case 'zap':
      case 'rayo':
        return <Zap className={className} style={{ color: primaryColor }} />;
      case 'brakes':
      case 'frenos':
      case 'disc':
      case 'disco':
        return <Disc className={className} style={{ color: primaryColor }} />;
      case 'fuel':
      case 'sistema':
      case 'gasolina':
      case 'inyeccion':
        return <Fuel className={className} style={{ color: primaryColor }} />;
      case 'flame':
      case 'fuego':
      case 'torque':
        return <Flame className={className} style={{ color: primaryColor }} />;
      case 'shield':
      case 'escudo':
      case 'seguridad':
        return <Shield className={className} style={{ color: primaryColor }} />;
      case 'sliders':
      case 'suspension':
      case 'ajuste':
        return <Sliders className={className} style={{ color: primaryColor }} />;
      case 'award':
      case 'garantia':
      case 'premio':
        return <Award className={className} style={{ color: primaryColor }} />;
      case 'displacement':
      case 'cilindrada':
      case 'motor':
      case 'gauge':
      default:
        return <Gauge className={className} style={{ color: primaryColor }} />;
    }
  };

  const features = customFeatures && customFeatures.length >= 4 ? customFeatures.slice(0, 4) : [
    { id: 'f1', title: 'AGARRE SUPERIOR', icon: 'zap' },
    { id: 'f2', title: 'DISEÑO ANTIDESLIZANTE', icon: 'grid' },
    { id: 'f3', title: 'MÁXIMA DURABILIDAD', icon: 'shield' },
    { id: 'f4', title: 'ERGONOMÍA PERFECTA', icon: 'ergonomics' },
  ];

  const globes = customGlobes && customGlobes.length >= 4 ? customGlobes.slice(0, 4) : [
    { id: 'g1', label: 'CILINDRADA', value: specs.displacement, icon: 'displacement' },
    { id: 'g2', label: 'POTENCIA', value: specs.power.split('@')[0].trim(), icon: 'power' },
    { id: 'g3', label: 'FRENOS', value: specs.brakes.includes('ABS') ? 'ABS DOBLE CANAL' : 'DOBLE DISCO', icon: 'brakes' },
    { id: 'g4', label: 'SISTEMA', value: specs.fuelSystem.toUpperCase(), icon: 'fuel' },
  ];

  const handleShare = async () => {
    const url = `${window.location.origin}/#/catalog/showcase?p=${currentProduct.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentProduct.brand} ${currentProduct.name}`,
          text: `Mira este producto ${currentProduct.brand} ${currentProduct.name} en ${companyName}:`,
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

  return (
    <div className="relative w-full max-w-full min-h-[calc(100vh-60px)] bg-[#07090e] text-white flex flex-col justify-between select-none font-sans py-3 sm:py-5 overflow-x-hidden">
      
      {/* Background Ambience with Dynamic Primary Color Glow */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle at 60% 40%, ${primaryColor}1a 0%, rgba(12, 16, 24, 0.7) 45%, rgba(7, 9, 14, 0.98) 80%),
            linear-gradient(to bottom, rgba(7, 9, 14, 0.85) 0%, rgba(7, 9, 14, 0.95) 100%),
            url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Main Hero Container */}
      <div className="relative z-10 w-full max-w-[1650px] mx-auto px-3 sm:px-8 lg:px-12 flex-1 flex flex-col justify-between space-y-4 min-w-0 overflow-x-hidden">
        
        {/* ── TOP HERO BANNER: Brand/Title/Price (Left) + Description/4 Features/Colors (Right) ── */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 lg:gap-8 bg-black/50 border border-white/10 rounded-2xl p-3.5 sm:p-5 backdrop-blur-md shadow-xl shrink-0 min-w-0">
          
          {/* LEFT SIDE (32-35%): Category Badge, Brand, Huge Model Title, Price Badge */}
          <div className="w-full md:w-[35%] lg:w-[32%] shrink-0 flex flex-col justify-center space-y-2 min-w-0">
            <div>
              <span 
                style={{ backgroundColor: primaryColor }}
                className="inline-block px-3 py-0.5 text-black font-black text-[11px] uppercase tracking-wider rounded shadow-md"
              >
                {categoryBadge}
              </span>
            </div>

            <div className="space-y-0 select-none min-w-0">
              <h1 className="flex flex-wrap items-baseline gap-2.5 drop-shadow-md min-w-0">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white tracking-tight leading-none">
                  {brandDisplay}
                </span>
                <span 
                  style={{ 
                    color: primaryColor,
                    textShadow: `0 4px 20px ${primaryColor}66`
                  }}
                  className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-none"
                >
                  {shortModelSlug}
                </span>
              </h1>
            </div>

            {/* Price Badge */}
            <div className="flex flex-wrap items-baseline gap-2 pt-1 min-w-0">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                S/ {currentProduct.price.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs font-bold text-slate-400 font-mono">
                USD $ {usdPrice} <span className="text-[10px] text-slate-500 font-normal">(REF.)</span>
              </div>
              <span 
                style={{ 
                  backgroundColor: `${primaryColor}26`, 
                  borderColor: `${primaryColor}80`, 
                  color: primaryColor 
                }}
                className="px-2 py-0.5 rounded border font-black text-[9.5px] uppercase tracking-wider shadow"
              >
                EDICIÓN 2026
              </span>
            </div>
          </div>

          {/* RIGHT SIDE (65-68%): Editorial Description, 4 Capsule Features (Horizontal Row), Colors Picker */}
          <div className="w-full md:w-[65%] lg:w-[68%] flex flex-col justify-center space-y-3 md:border-l md:border-white/10 md:pl-6 min-w-0">
            
            {/* Editorial Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light break-words">
              {customEditorialDescription || (currentProduct as any)?.editorialDescription || currentProduct?.description || (
                currentProduct.model ? (
                  <>
                    La nueva {companyName} <strong className="text-white font-bold">{currentProduct.brand} {currentProduct.model}</strong> no solo tiene un motor potente con tecnología de vanguardia, sino que viene equipada con frenado <strong className="text-white font-bold">{specs.brakes}</strong>, <strong className="text-white font-bold">{specs.fuelSystem}</strong> y suspensión de alta estabilidad para máximo desempeño y confort.
                  </>
                ) : (
                  <>
                    Diseño de ingeniería de vanguardia con acabados premium, máxima durabilidad y componentes de alta gama listos para dominar cualquier ruta y entregar la mejor experiencia de conducción.
                  </>
                )
              )}
            </p>

            {/* 4 Key Feature Stadium Capsule Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
              {features.map((f) => (
                <div 
                  key={f.id}
                  style={{
                    borderColor: `${primaryColor}66`,
                  }}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-full bg-black/80 hover:bg-black/95 border transition-all duration-300 group cursor-default shadow-md backdrop-blur-sm min-w-0 overflow-hidden"
                >
                  <div 
                    style={{
                      borderColor: `${primaryColor}80`,
                    }}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                  >
                    {renderIcon(f.icon)}
                  </div>
                  <span className="text-[8.5px] sm:text-[9.5px] font-black text-white uppercase tracking-tight leading-tight truncate min-w-0">
                    {f.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Color variants */}
            <div className="flex items-center gap-3 pt-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">COLOR:</span>
              <div className="flex items-center gap-2">
                {colorsList.map((c, idx) => {
                  const isSel = selectedColorIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedColorIndex(idx);
                        setSelectedAngleIndex(0);
                      }}
                      title={`${c.color} (${c.stock ?? 1} disp.)`}
                      style={{
                        backgroundColor: c.hex || (idx === 0 ? '#111827' : idx === 1 ? '#dc2626' : idx === 2 ? '#2563eb' : '#ffffff'),
                        borderColor: isSel ? primaryColor : 'rgba(255,255,255,0.2)',
                      }}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        isSel ? 'ring-2 scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {isSel && <Check size={12} className={c.hex === '#ffffff' || c.color.toLowerCase().includes('blanco') ? 'text-black' : 'text-white'} />}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold" style={{ color: primaryColor }}>
                {activeColor?.color}
              </span>
            </div>

          </div>

        </div>

        {/* ── CENTER STAGE: Centered Product Image Stage + 4 Stadium Capsule Telemetry Globes Orbiting the Product ── */}
        <div className="relative flex items-center justify-center flex-1 my-auto min-h-[300px] sm:min-h-[420px] lg:min-h-[460px] py-2 sm:py-4 w-full max-w-full overflow-hidden min-w-0">
          
          {/* Tech HUD Concentric Circular Rings with Dynamic Primary Color */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div 
              style={{ borderColor: `${primaryColor}33` }}
              className="w-[280px] sm:w-[440px] lg:w-[500px] h-[280px] sm:h-[440px] lg:h-[500px] rounded-full border border-dashed animate-[spin_60s_linear_infinite] shrink-0" 
            />
            <div 
              style={{ 
                borderColor: `${primaryColor}4d`,
                boxShadow: `0 0 45px ${primaryColor}26`
              }}
              className="absolute w-[220px] sm:w-[360px] lg:w-[420px] h-[220px] sm:h-[360px] lg:h-[420px] rounded-full border-2 shrink-0" 
            />
            <div 
              style={{ borderColor: `${primaryColor}40` }}
              className="absolute w-[160px] sm:w-[260px] lg:w-[310px] h-[160px] sm:h-[260px] lg:h-[310px] rounded-full border shrink-0" 
            />
          </div>

          {/* ── FLOATING SPEC CAPSULE 1: Top-Left (Cilindrada) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute top-2 left-0 sm:left-4 lg:left-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              {renderGlobeIcon(globes[0]?.icon || 'displacement')}
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{globes[0]?.label || 'CILINDRADA'}</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{globes[0]?.value || specs.displacement}</span>
            </div>
          </div>

          {/* ── FLOATING SPEC CAPSULE 2: Bottom-Left (Potencia) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute bottom-2 left-0 sm:left-4 lg:left-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              {renderGlobeIcon(globes[1]?.icon || 'power')}
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{globes[1]?.label || 'POTENCIA'}</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{globes[1]?.value || specs.power.split('@')[0].trim()}</span>
            </div>
          </div>

          {/* ── FLOATING SPEC CAPSULE 3: Top-Right (Frenos) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute top-2 right-0 sm:right-4 lg:right-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              {renderGlobeIcon(globes[2]?.icon || 'brakes')}
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{globes[2]?.label || 'FRENOS'}</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{globes[2]?.value || (specs.brakes.includes('ABS') ? 'ABS DOBLE CANAL' : 'DOBLE DISCO')}</span>
            </div>
          </div>

          {/* ── FLOATING SPEC CAPSULE 4: Bottom-Right (Sistema) ── */}
          <div 
            style={{ 
              borderColor: `${primaryColor}`,
              boxShadow: `0 0 20px ${primaryColor}26`
            }}
            className="absolute bottom-2 right-0 sm:right-4 lg:right-8 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl hover:scale-105 transition-all duration-300 group cursor-default min-w-[160px]"
          >
            <div 
              style={{ borderColor: `${primaryColor}` }}
              className="w-8 h-8 rounded-full border bg-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
            >
              {renderGlobeIcon(globes[3]?.icon || 'fuel')}
            </div>
            <div className="flex flex-col text-left">
              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{globes[3]?.label || 'SISTEMA'}</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">{globes[3]?.value || specs.fuelSystem.toUpperCase()}</span>
            </div>
          </div>

          {/* Main Center Product Image */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 sm:px-4 group min-w-0">
            {processedImage || activeImagePath ? (
              <div className="relative flex flex-col items-center max-w-full">
                <img
                  src={processedImage || activeImagePath}
                  alt={currentProduct.name}
                  className="max-h-[260px] sm:max-h-[360px] md:max-h-[420px] lg:max-h-[480px] w-auto max-w-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] transition-all duration-300 group-hover:scale-105"
                />
                <div className="w-[80%] h-6 bg-black/90 blur-xl rounded-full mt-[-10px] pointer-events-none" />
              </div>
            ) : (
              <div className="w-64 sm:w-72 h-44 sm:h-48 flex items-center justify-center text-slate-500 text-xs border border-white/10 rounded-2xl bg-black/40">
                (Imagen no disponible)
              </div>
            )}
          </div>

          {/* Photo Navigation Arrows */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-1 sm:px-4 md:px-6 z-20">
            <button
              type="button"
              onClick={handlePrev}
              className="pointer-events-auto w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-black/80 hover:bg-black/95 text-white border-2 border-white/25 hover:border-white/60 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md hover:scale-110 active:scale-90 cursor-pointer group"
              title="Foto Anterior"
            >
              <ChevronLeft className="w-5 h-5 sm:w-8 sm:h-8 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="pointer-events-auto w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-black/80 hover:bg-black/95 text-white border-2 border-white/25 hover:border-white/60 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md hover:scale-110 active:scale-90 cursor-pointer group"
              title="Siguiente Foto"
            >
              <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
            </button>
          </div>

        </div>

        {/* ── 4 SPEC CAPSULES BAR (Visible on mobile where floating orbital globes are hidden) ── */}
        <div className="grid grid-cols-2 gap-2 sm:hidden pt-2 z-20 w-full min-w-0">
          {globes.map((g, idx) => (
            <div 
              key={g.id || idx} 
              style={{ 
                borderColor: primaryColor,
                boxShadow: `0 0 15px ${primaryColor}26`
              }}
              className="flex items-center gap-2 p-2 rounded-full bg-black/90 hover:bg-black border transition-all duration-200 min-w-0 overflow-hidden"
            >
              <div 
                style={{ borderColor: primaryColor }}
                className="w-7 h-7 rounded-full bg-black border flex items-center justify-center shrink-0"
              >
                {renderGlobeIcon(g.icon)}
              </div>
              <div className="flex flex-col text-left truncate min-w-0 flex-1 overflow-hidden">
                <span className="block text-[7.5px] text-slate-400 font-bold uppercase leading-none mb-0.5 truncate">{g.label}</span>
                <span className="text-xs font-black text-white uppercase tracking-tight leading-none truncate">{g.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── BOTTOM UTILITY BAR: Breadcrumb (Left) | Horizontal 3-Thumbnails & Action Buttons (Right) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-3 pb-1 border-t border-white/10 shrink-0 z-20 w-full min-w-0">
          
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium truncate max-w-full">
            <span className="hover:text-white cursor-pointer transition-colors shrink-0">Catálogo Oficial</span>
            <span className="text-slate-600 shrink-0">/</span>
            <span className="font-bold shrink-0" style={{ color: primaryColor }}>{categoryBadge}</span>
            <span className="text-slate-600 shrink-0">/</span>
            <span className="text-white font-semibold truncate">{currentProduct.brand}</span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto min-w-0">
            {/* 3 Horizontal Angle Thumbnails */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/60 p-1 sm:p-1.5 rounded-xl border border-white/10 backdrop-blur-md shrink-0">
              {angleThumbnails.map((thumb, idx) => {
                const isSelected = selectedAngleIndex === idx;
                return (
                  <button
                    key={thumb.id}
                    type="button"
                    onClick={() => setSelectedAngleIndex(idx)}
                    style={{
                      borderColor: isSelected ? primaryColor : undefined,
                      boxShadow: isSelected ? `0 0 15px ${primaryColor}66` : undefined,
                    }}
                    className={`relative w-14 sm:w-20 h-10 sm:h-13 rounded-lg bg-black/90 border p-1 flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'ring-2 scale-105'
                        : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/30'
                    }`}
                    title={thumb.label}
                  >
                    {thumb.is360 && (
                      <span 
                        style={{ backgroundColor: primaryColor }}
                        className="absolute top-0.5 right-0.5 px-1 py-0.2 text-black font-black text-[7px] sm:text-[7.5px] rounded uppercase tracking-wider flex items-center gap-0.5 shadow z-10"
                      >
                        <RotateCw size={7} /> 360°
                      </span>
                    )}
                    {thumb.img ? (
                      <img 
                        src={thumb.img} 
                        alt={thumb.label} 
                        className="max-h-full w-auto object-contain drop-shadow" 
                      />
                    ) : (
                      <span className="text-[9px] text-slate-500">Vista {idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenWhatsApp(currentProduct, activeColor?.color)}
                title="Cotizar por WhatsApp con un Asesor"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#25d366] to-[#1eb854] hover:from-[#20bd5a] hover:to-[#189b45] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.45)] border border-emerald-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MessageCircle size={15} className="fill-black" />
                <span className="hidden sm:inline">Cotizar WhatsApp</span>
                <span className="sm:hidden text-[11px]">Cotizar</span>
              </button>

              {onExportPdf && (
                <button
                  type="button"
                  onClick={() => onExportPdf(currentProduct)}
                  title="Descargar Ficha Técnica PDF"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  <FileDown size={14} />
                  <span className="hidden sm:inline">Ficha PDF</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShare}
                title="Compartir enlace"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Compartir'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
