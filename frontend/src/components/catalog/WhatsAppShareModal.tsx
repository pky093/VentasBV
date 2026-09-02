import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Send, Copy, Check, MessageCircle, Phone, User, 
  ExternalLink, Sparkles, Building, DollarSign, Palette, FileText
} from 'lucide-react';
import { Product, Customer, customersService, settingsService } from '../../lib/db-services';
import { formatCurrency } from '../../lib/formatters';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  allProducts?: Product[];
  exchangeRate?: number;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  product,
  allProducts = [],
  exchangeRate = 3.75,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [includeUsdPrice, setIncludeUsdPrice] = useState(true);
  const [includeColors, setIncludeColors] = useState(true);
  const [includeDealerInfo, setIncludeDealerInfo] = useState(true);
  const [includeCatalogLink, setIncludeCatalogLink] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareMode, setShareMode] = useState<'SINGLE' | 'MULTI'>(product ? 'SINGLE' : 'MULTI');

  const [tenantInfo, setTenantInfo] = useState<{
    name?: string;
    trade_name?: string;
    phone?: string;
    address?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (product) {
        setShareMode('SINGLE');
      } else {
        setShareMode('MULTI');
      }
    }
  }, [isOpen, product]);

  const loadInitialData = async () => {
    try {
      const [custs, tInfo] = await Promise.all([
        customersService.getCustomers(),
        settingsService.getTenantInfo(),
      ]);
      setCustomers(custs || []);
      setTenantInfo(tInfo || {});
    } catch (err) {
      console.error('Error loading WhatsApp share data:', err);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerPhone('');
      setCustomerName('');
      return;
    }
    const found = customers.find(c => c.id === customerId);
    if (found) {
      setCustomerName(found.fullName || found.name || '');
      setCustomerPhone(found.phone || '');
    }
  };

  // Generate public catalog URL
  const publicBaseUrl = `${window.location.origin}/#`;
  const publicCatalogUrl = useMemo(() => {
    if (shareMode === 'SINGLE' && product?.id) {
      return `${publicBaseUrl}/catalog/showcase?p=${product.id}`;
    }
    return `${publicBaseUrl}/catalog/showcase`;
  }, [publicBaseUrl, shareMode, product]);

  // Generate formatted WhatsApp message text
  const messageText = useMemo(() => {
    const dealerName = tenantInfo.trade_name || tenantInfo.name || 'Ventas BV Concesionario';
    const dealerPhone = tenantInfo.phone || '';
    const dealerAddress = tenantInfo.address || '';

    const greeting = customerName.trim()
      ? `¡Hola *${customerName.trim()}*! 👋`
      : `¡Hola! 👋`;

    if (shareMode === 'SINGLE' && product) {
      const usdPrice = product.price > 0 && exchangeRate > 0 
        ? Math.round(product.price / exchangeRate) 
        : 0;

      let msg = `${greeting}\n\n`;
      msg += `Te saluda *${dealerName}*. Te compartimos la información y cotización del modelo que consultaste:\n\n`;
      msg += `🏍️ *${product.brand?.toUpperCase() || ''} ${product.name?.toUpperCase() || ''}*\n`;
      if (product.category) msg += `📌 *Categoría:* ${product.category}\n`;
      if (product.model) msg += `⚡ *Modelo:* ${product.model}\n`;
      msg += `💰 *Precio Especial:* S/ ${product.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      
      if (includeUsdPrice && usdPrice > 0) {
        msg += `💵 *Ref. Dólares:* USD $ ${usdPrice.toLocaleString('en-US')} (T/C: ${exchangeRate.toFixed(2)})\n`;
      }

      if (includeColors && product.colors && product.colors.length > 0) {
        const availableColors = product.colors
          .filter(c => Number(c.stock) > 0 || c.stock === undefined)
          .map(c => c.color)
          .join(', ');
        if (availableColors) {
          msg += `🎨 *Colores en Stock:* ${availableColors}\n`;
        }
      }

      if (customNote.trim()) {
        msg += `\n📝 *Detalle:* ${customNote.trim()}\n`;
      }

      if (includeCatalogLink) {
        msg += `\n🌐 *Ver ficha técnica completa y fotos interactivas aquí:*\n${publicCatalogUrl}\n`;
      }

      if (includeDealerInfo) {
        msg += `\n📍 *Visítanos:* ${dealerAddress || 'Av. Principal - Tienda Autorizada'}\n`;
        if (dealerPhone) msg += `📞 *Teléfono/Atención:* ${dealerPhone}\n`;
      }

      msg += `\n¿Deseas programar una visita para verla en tienda o simular tu financiamiento a crédito? 🚀`;
      return msg;
    } else {
      // Multiple / Full catalog message
      const activeProducts = allProducts.filter(p => p.status !== 'INACTIVE');
      let msg = `${greeting}\n\n`;
      msg += `Te saluda *${dealerName}*. Te compartimos nuestro *Catálogo Digital de Motocicletas Activas*:\n\n`;

      activeProducts.slice(0, 6).forEach((p, idx) => {
        const usdPrice = p.price > 0 && exchangeRate > 0 ? Math.round(p.price / exchangeRate) : 0;
        msg += `${idx + 1}. *${p.brand || ''} ${p.name}*\n`;
        msg += `   💰 S/ ${p.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (includeUsdPrice && usdPrice > 0) {
          msg += ` | USD $ ${usdPrice.toLocaleString('en-US')}`;
        }
        msg += `\n`;
      });

      if (activeProducts.length > 6) {
        msg += `\n...y *${activeProducts.length - 6} modelos más* disponibles en tienda!\n`;
      }

      if (customNote.trim()) {
        msg += `\n📝 *Promoción:* ${customNote.trim()}\n`;
      }

      if (includeCatalogLink) {
        msg += `\n🌐 *Explora todo nuestro catálogo interactivo con fotos HD y detalles:*\n${publicCatalogUrl}\n`;
      }

      if (includeDealerInfo) {
        msg += `\n📍 *Ubicación:* ${dealerAddress || 'Tienda Principal'}\n`;
        if (dealerPhone) msg += `📞 *Contacto:* ${dealerPhone}\n`;
      }

      msg += `\n¡Escríbenos para brindarte asesoría personalizada o cotizar financiamiento! 🏍️💨`;
      return msg;
    }
  }, [
    shareMode, product, allProducts, customerName, includeUsdPrice, 
    includeColors, includeDealerInfo, includeCatalogLink, customNote, 
    exchangeRate, tenantInfo, publicCatalogUrl
  ]);

  const cleanPhoneNumber = (raw: string) => {
    let num = raw.replace(/\D/g, '');
    if (num.length === 9 && !num.startsWith('51')) {
      num = '51' + num;
    }
    return num;
  };

  const handleSendWhatsApp = () => {
    const rawPhone = customerPhone.trim();
    const phone = cleanPhoneNumber(rawPhone);
    const encoded = encodeURIComponent(messageText);
    
    let waUrl = '';
    if (phone) {
      waUrl = `https://wa.me/${phone}?text=${encoded}`;
    } else {
      waUrl = `https://wa.me/?text=${encoded}`;
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicCatalogUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Enviar Catálogo por WhatsApp
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {shareMode === 'SINGLE' ? 'Moto Individual' : 'Catálogo General'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Comparte fichas estéticas, cotizaciones y enlaces interactivos directamente con tu cliente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Settings and Client Selection */}
          <div className="lg:col-span-5 p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/50">
            {/* Mode Switch if product is provided */}
            {product && (
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setShareMode('SINGLE')}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                    shareMode === 'SINGLE'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ficha de {product.name.slice(0, 18)}...
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode('MULTI')}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                    shareMode === 'MULTI'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todo el Catálogo ({allProducts.filter(p => p.status !== 'INACTIVE').length})
                </button>
              </div>
            )}

            {/* Client Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-emerald-400" />
                Seleccionar Cliente Registrado (Opcional)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Escribir datos manualmente o cliente libre --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Name and Phone Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-emerald-400" />
                  WhatsApp / Celular
                </label>
                <input
                  type="text"
                  placeholder="999 888 777"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Custom Note or Offer */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <FileText size={12} className="text-amber-400" />
                Nota Adicional / Promoción / Descuento
              </label>
              <input
                type="text"
                placeholder="Ej. Incluye casco de regalo + trámite de placa gratis"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-950/50 hover:bg-slate-950">
                <span className="flex items-center gap-2">
                  <DollarSign size={14} className="text-emerald-400" />
                  Incluir Precio Referencial en Dólares (USD)
                </span>
                <input
                  type="checkbox"
                  checked={includeUsdPrice}
                  onChange={(e) => setIncludeUsdPrice(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-slate-900 border-slate-700"
                />
              </label>

              {shareMode === 'SINGLE' && (
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-950/50 hover:bg-slate-950">
                  <span className="flex items-center gap-2">
                    <Palette size={14} className="text-pink-400" />
                    Listar Colores Disponibles en Stock
                  </span>
                  <input
                    type="checkbox"
                    checked={includeColors}
                    onChange={(e) => setIncludeColors(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-slate-900 border-slate-700"
                  />
                </label>
              )}

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-950/50 hover:bg-slate-950">
                <span className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-cyan-400" />
                  Incluir Enlace al Catálogo Web Interactivo
                </span>
                <input
                  type="checkbox"
                  checked={includeCatalogLink}
                  onChange={(e) => setIncludeCatalogLink(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-slate-900 border-slate-700"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-950/50 hover:bg-slate-950">
                <span className="flex items-center gap-2">
                  <Building size={14} className="text-amber-400" />
                  Incluir Datos de la Tienda y Ubicación
                </span>
                <input
                  type="checkbox"
                  checked={includeDealerInfo}
                  onChange={(e) => setIncludeDealerInfo(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-slate-900 border-slate-700"
                />
              </label>
            </div>

            {/* Quick Link Info */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="overflow-hidden">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Enlace Público para Cliente</div>
                <div className="text-xs text-cyan-400 font-mono truncate">{publicCatalogUrl}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyPublicLink}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Copiar Enlace"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Right Column: Live WhatsApp Bubble Preview */}
          <div className="lg:col-span-7 p-6 bg-slate-950 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-400" />
                Vista Previa del Mensaje (WhatsApp)
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? '¡Copiado!' : 'Copiar Texto'}
              </button>
            </div>

            {/* WhatsApp Chat Background Simulation */}
            <div className="flex-1 rounded-2xl bg-[#0b141a] p-4 border border-slate-800 overflow-y-auto flex flex-col justify-start relative shadow-inner min-h-[300px]">
              {/* Product Thumbnail Header if Single */}
              {shareMode === 'SINGLE' && product?.imagePath && (
                <div className="mb-3 p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center gap-3">
                  <img
                    src={product.imagePath}
                    alt={product.name}
                    className="w-16 h-12 object-contain bg-slate-950 rounded-lg p-1"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{product.brand} {product.name}</div>
                    <div className="text-xs text-emerald-400 font-semibold font-mono">
                      S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Bubble */}
              <div className="self-start max-w-[90%] bg-[#005c4b] text-slate-100 rounded-2xl rounded-tl-sm p-4 text-xs leading-relaxed whitespace-pre-wrap font-sans shadow-md selection:bg-emerald-800">
                {messageText}
                <div className="text-[10px] text-emerald-200/60 text-right mt-2 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {customerPhone.trim() 
              ? `Se enviará directamente al número: ${customerPhone.trim()}`
              : 'Se abrirá WhatsApp para que elijas el contacto o grupo a enviar.'}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98]"
            >
              <Send size={15} />
              Enviar a WhatsApp Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
