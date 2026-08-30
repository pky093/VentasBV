import React, { useState } from 'react';
import { 
  Gauge, Flame, Disc, Fuel, MessageCircle, FileDown, 
  Compass, Calculator, Check, Sparkles, ShieldCheck, 
  ChevronLeft, ChevronRight, Award, Zap, HelpCircle, 
  Gift, Wrench, Shield, CheckCircle2, Share2, Copy
} from 'lucide-react';
import { Product } from '../../lib/db-services';
import { MotorcycleTelemetry } from '../../lib/motorcycle-specs';

/* -------------------------------------------------------------------------- */
/* 1. Telemetry Specs Deck (4 Interactive Cards with friendly explanations)  */
/* -------------------------------------------------------------------------- */
interface ShowcaseTelemetryDeckProps {
  specs: MotorcycleTelemetry;
}

export const ShowcaseTelemetryDeck: React.FC<ShowcaseTelemetryDeckProps> = ({ specs }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const items = [
    {
      id: 'displacement',
      label: 'Cilindrada',
      value: specs.displacement,
      desc: 'Capacidad del motor para mayor fuerza y aceleración.',
      icon: Gauge,
      accent: 'text-amber-400',
      bgAccent: 'bg-amber-400/10 border-amber-400/20',
    },
    {
      id: 'power',
      label: 'Potencia Máx.',
      value: specs.power.split('@')[0].trim(),
      desc: 'Caballos de fuerza (HP) para velocidad y respuesta en carretera.',
      icon: Flame,
      accent: 'text-rose-400',
      bgAccent: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'brakes',
      label: 'Frenos & Seguridad',
      value: specs.brakes.includes('ABS') ? 'ABS Doble Canal' : 'Disco Del / Tras',
      desc: 'Sistema antibloqueo para frenadas seguras en lluvia y asfalto.',
      icon: Disc,
      accent: 'text-cyan-400',
      bgAccent: 'bg-cyan-400/10 border-cyan-400/20',
    },
    {
      id: 'fuel',
      label: 'Alimentación',
      value: specs.fuelSystem.includes('Inyección') ? 'Inyección FI' : 'Carburado Opt.',
      desc: 'Optimiza el consumo y arranque rápido en cualquier clima.',
      icon: Fuel,
      accent: 'text-emerald-400',
      bgAccent: 'bg-emerald-400/10 border-emerald-400/20',
    },
  ];

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
      {items.map((item) => {
        const Icon = item.icon;
        const isHovered = activeTooltip === item.id;
        return (
          <div
            key={item.id}
            onMouseEnter={() => setActiveTooltip(item.id)}
            onMouseLeave={() => setActiveTooltip(null)}
            className="group relative p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center gap-3 transition-all duration-200 cursor-help"
          >
            <div className={`p-2.5 rounded-xl border shrink-0 ${item.bgAccent} ${item.accent} transition-transform group-hover:scale-105`}>
              <Icon size={18} />
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                {item.label}
              </div>
              <div className="text-xs sm:text-sm font-black text-white truncate font-mono mt-0.5">
                {item.value}
              </div>
            </div>

            {/* Friendly UX Tooltip */}
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-xl bg-slate-900/95 border border-white/15 text-[11px] text-slate-300 shadow-2xl z-30 pointer-events-none text-center backdrop-blur-md animate-fade-in">
                <span className="font-bold text-white block mb-0.5">{item.label}</span>
                {item.desc}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. Color Studio Picker (Visual chips + Stock counter + Dynamic lighting)   */
/* -------------------------------------------------------------------------- */
interface ShowcaseColorPickerProps {
  colors: { color: string; hex?: string; stock?: number }[];
  selectedIndex: number;
  onSelectColor: (index: number) => void;
}

export const ShowcaseColorPicker: React.FC<ShowcaseColorPickerProps> = ({
  colors,
  selectedIndex,
  onSelectColor,
}) => {
  const activeColor = colors[selectedIndex] || colors[0];

  return (
    <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
            Colores Disponibles:
          </span>
          <span className="text-xs font-black text-yellow-400 px-2 py-0.5 rounded-md bg-yellow-400/10 border border-yellow-400/20">
            {activeColor.color}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {Number(activeColor.stock) > 0 ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} /> {activeColor.stock} en stock
            </span>
          ) : (
            <span className="text-amber-400 font-semibold">Bajo pedido</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3 pt-1">
        {colors.map((c, idx) => {
          const isSelected = selectedIndex === idx;
          const isWhite = c.hex === '#ffffff' || c.hex === '#f8fafc' || c.color.toLowerCase().includes('blanco');
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectColor(idx)}
              title={`${c.color} (${c.stock ?? 1} disp.)`}
              className={`group relative flex items-center justify-center p-1 rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#06090e] scale-110'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
            >
              <span
                className="w-8 h-8 rounded-lg border border-white/30 shadow-inner flex items-center justify-center transition-transform"
                style={{
                  backgroundColor: c.hex || (idx === 0 ? '#dc2626' : idx === 1 ? '#0f172a' : '#f8fafc'),
                }}
              >
                {isSelected && (
                  <Check size={14} className={isWhite ? 'text-black' : 'text-white'} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Price & Interactive Loan Simulator Card                                */
/* -------------------------------------------------------------------------- */
interface ShowcasePriceCardProps {
  price: number;
  exchangeRate?: number;
  onOpenWhatsApp: () => void;
}

export const ShowcasePriceCard: React.FC<ShowcasePriceCardProps> = ({
  price,
  exchangeRate = 3.75,
  onOpenWhatsApp,
}) => {
  const [showSimulator, setShowSimulator] = useState(false);
  const [months, setMonths] = useState(36);
  const [initialPct, setInitialPct] = useState(20);

  const usdPrice = price > 0 && exchangeRate > 0 ? Math.round(price / exchangeRate) : 0;
  const initialAmount = (price * initialPct) / 100;
  const loanAmount = Math.max(0, price - initialAmount);
  const monthlyRate = 0.015; // 1.5% mensual referencial
  const monthlyQuota = months > 0
    ? Math.round((loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1))
    : 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-white/10 shadow-2xl p-5 relative overflow-hidden space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap size={13} className="text-yellow-400" />
          PRECIO OFICIAL DE TIENDA
        </span>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
          ● DISPONIBLE HOY
        </span>
      </div>

      {/* Hero Price & USD Conversion */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-sans">
          S/ {price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {usdPrice > 0 && (
          <div className="text-xs font-bold text-slate-300 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            USD $ {usdPrice.toLocaleString('en-US')} <span className="text-[10px] text-slate-500">(T/C {exchangeRate.toFixed(2)})</span>
          </div>
        )}
      </div>

      {/* Credit Quota Quick Estimate Banner */}
      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
        <div className="text-xs text-slate-300">
          <span className="text-slate-400">Financiamiento desde: </span>
          <strong className="font-extrabold text-yellow-400 font-mono text-sm">
            S/ {monthlyQuota > 0 ? monthlyQuota.toLocaleString('es-PE') : Math.round(price / 36 * 1.15).toLocaleString('es-PE')}
          </strong>
          <span className="text-[10px] text-slate-400"> /mes ({months} cuotas)</span>
        </div>

        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20 transition-all hover:bg-yellow-400/20"
        >
          <Calculator size={13} />
          <span>{showSimulator ? 'Cerrar' : 'Simular Cuotas'}</span>
        </button>
      </div>

      {/* Expandable Credit Mini Simulator */}
      {showSimulator && (
        <div className="mt-3 p-4 rounded-xl bg-black/60 border border-white/10 space-y-3.5 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-white border-b border-white/10 pb-2">
            <span>Simulador de Crédito Vehicular</span>
            <span className="text-yellow-400 font-mono">S/ {monthlyQuota.toLocaleString('es-PE')}/mes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1.5 flex justify-between">
                <span>Cuota Inicial: {initialPct}%</span>
                <span className="font-mono text-white">S/ {initialAmount.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</span>
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={initialPct}
                onChange={(e) => setInitialPct(Number(e.target.value))}
                className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">
                Plazo de Financiamiento
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[12, 24, 36, 48].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                      months === m
                        ? 'bg-yellow-400 text-black shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic leading-tight">
            * Valores referenciales aproximados para simulación. Sujeto a evaluación crediticia y requisitos del cliente.
          </p>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. Buyer Value Props & Benefits Grid                                       */
/* -------------------------------------------------------------------------- */
export const ShowcaseBenefitsGrid: React.FC = () => {
  const benefits = [
    { icon: Shield, title: 'Garantía Oficial', subtitle: '12 meses o 10,000 km' },
    { icon: Award, title: 'Trámite Incluido', subtitle: 'Placa y tarjeta de propiedad' },
    { icon: Gift, title: 'Casco de Regalo', subtitle: 'Certificado de seguridad' },
    { icon: Wrench, title: 'Primer Mantenimiento', subtitle: 'Mano de obra bonificada' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      {benefits.map((b, idx) => {
        const Icon = b.icon;
        return (
          <div
            key={idx}
            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5 hover:bg-white/[0.04] transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 shrink-0">
              <Icon size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">{b.title}</div>
              <div className="text-[10px] text-slate-400 truncate">{b.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. User-Friendly Action Button Group (High Conversion & Friendly UX)       */
/* -------------------------------------------------------------------------- */
interface ShowcaseActionGroupProps {
  product: Product;
  selectedColorName?: string;
  onOpenWhatsApp: (product: Product, color?: string) => void;
  onExportPdf?: (product: Product) => void;
}

export const ShowcaseActionGroup: React.FC<ShowcaseActionGroupProps> = ({
  product,
  selectedColorName,
  onOpenWhatsApp,
  onExportPdf,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareLink = async () => {
    const url = `${window.location.origin}/catalog/showcase?p=${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${product.brand} ${product.name}`,
          text: `Mira esta motocicleta ${product.brand} ${product.name} en el catálogo oficial:`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestRide = () => {
    const text = `¡Hola! 👋 Me interesa coordinar una *Prueba de Manejo (Test Ride)* para el modelo *${product.brand} ${product.name}* (${selectedColorName || 'Color en tienda'}). ¿En qué sede o horario tienen disponibilidad?`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-2.5 pt-2">
      {/* Primary CTA (High-Impact Glowing Button) */}
      <button
        type="button"
        onClick={() => onOpenWhatsApp(product, selectedColorName)}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2.5 group cursor-pointer"
      >
        <MessageCircle size={19} className="group-hover:scale-110 transition-transform" />
        <span>QUIERO ESTA MOTO &bull; COTIZAR POR WHATSAPP</span>
      </button>

      {/* Secondary CTAs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleTestRide}
          className="py-2.5 px-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 active:scale-95"
          title="Agendar prueba de manejo en tienda"
        >
          <Compass size={14} className="text-yellow-400 shrink-0" />
          <span className="truncate">Test Ride</span>
        </button>

        {onExportPdf && (
          <button
            type="button"
            onClick={() => onExportPdf(product)}
            className="py-2.5 px-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 active:scale-95"
            title="Descargar Ficha Técnica en PDF"
          >
            <FileDown size={14} className="text-cyan-400 shrink-0" />
            <span className="truncate">Ficha PDF</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleShareLink}
          className="py-2.5 px-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 active:scale-95"
          title="Compartir enlace con un amigo"
        >
          {copied ? <Check size={14} className="text-emerald-400 shrink-0" /> : <Share2 size={14} className="text-pink-400 shrink-0" />}
          <span className="truncate">{copied ? '¡Copiado!' : 'Compartir'}</span>
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 6. Showcase Navigation Dock (Bottom Model Selector with Keyboard Nav)      */
/* -------------------------------------------------------------------------- */
interface ShowcaseNavDockProps {
  products: Product[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export const ShowcaseNavDock: React.FC<ShowcaseNavDockProps> = ({
  products,
  currentIndex,
  onSelectIndex,
}) => {
  return (
    <div className="relative z-20 px-6 md:px-10 py-3.5 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center gap-4 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Award size={14} className="text-yellow-400" />
          Modelos ({products.length}):
        </span>
        <span className="hidden sm:inline-block text-[9px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
          Usa teclas [←] [→]
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {products.map((p, idx) => {
          const isCurrent = currentIndex === idx;
          return (
            <button
              key={p.id || idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-200 whitespace-nowrap text-left cursor-pointer ${
                isCurrent
                  ? 'bg-yellow-400 text-black font-extrabold border-yellow-300 shadow-lg scale-105'
                  : 'bg-slate-900/80 border-white/10 hover:border-white/30 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.imagePath && (
                <img
                  src={p.imagePath}
                  alt={p.name}
                  className="w-7 h-5 object-contain"
                />
              )}
              <span className="text-xs">{p.name}</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                isCurrent ? 'bg-black/20 text-black' : 'bg-white/5 text-yellow-400'
              }`}>
                S/ {p.price.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
