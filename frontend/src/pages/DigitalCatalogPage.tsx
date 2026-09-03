import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Save, ExternalLink, RefreshCw, Layers, Palette, 
  Image as ImageIcon, Plus, Trash2, Check, Upload, Sliders, 
  Zap, Shield, Award, Flame, Sun, Grid, Eye, RotateCw, Gauge, 
  Disc, ArrowRight, Search, ChevronDown, CheckCircle2, Fuel, Pencil, X,
  Copy, Globe, Share2
} from 'lucide-react';
import { PageHeader, Button, Badge, Card, CardHeader, CardBody, Tabs, Modal, SearchInput } from '../components/ui';
import { productsService, catalogService, settingsService, Product, Category, ColorVariant } from '../lib/db-services';
import { useBranch } from '../context/BranchContext';
import { SomomotoHeroShowcase, ShowcaseFeatureItem, ShowcaseGlobeItem } from '../components/catalog/SomomotoHeroShowcase';
import { ColorAngleManager } from '../components/catalog/ColorAngleManager';
import Swal from 'sweetalert2';

const DEFAULT_COLOR_PRESETS = [
  { name: 'Dorado Tech', hex: '#f3c623' },
  { name: 'Cyan Neón', hex: '#06b6d4' },
  { name: 'Rojo Racing', hex: '#ef4444' },
];

const AVAILABLE_ICONS = [
  { id: 'zap', label: 'Rayo / Energía', icon: <Zap size={15} /> },
  { id: 'grid', label: 'Matriz / Diseño', icon: <Grid size={15} /> },
  { id: 'shield', label: 'Escudo / Durabilidad', icon: <Shield size={15} /> },
  { id: 'ergonomics', label: 'Ergonomía / Confort', icon: <Sliders size={15} /> },
  { id: 'award', label: 'Premio / Garantía', icon: <Award size={15} /> },
  { id: 'flame', label: 'Fuego / Potencia', icon: <Flame size={15} /> },
  { id: 'layers', label: 'Capas / Material', icon: <Layers size={15} /> },
  { id: 'sun', label: 'Brillo / Visibilidad', icon: <Sun size={15} /> },
  { id: 'sparkles', label: 'Premium / Destacado', icon: <Sparkles size={15} /> },
  { id: 'gauge', label: 'Velocidad / Control', icon: <Gauge size={15} /> },
];

const GLOBE_ICONS = [
  { id: 'displacement', label: 'Cilindrada / Motor', icon: <Gauge size={15} /> },
  { id: 'power', label: 'Potencia / Rendimiento', icon: <Zap size={15} /> },
  { id: 'brakes', label: 'Frenos / ABS', icon: <Disc size={15} /> },
  { id: 'fuel', label: 'Sistema / Inyección', icon: <Fuel size={15} /> },
  { id: 'flame', label: 'Torque / Fuego', icon: <Flame size={15} /> },
  { id: 'shield', label: 'Seguridad / Chasis', icon: <Shield size={15} /> },
  { id: 'sliders', label: 'Suspensión / Confort', icon: <Sliders size={15} /> },
  { id: 'award', label: 'Garantía / Calidad', icon: <Award size={15} /> },
];

export default function DigitalCatalogPage() {
  const { activeBranchId } = useBranch();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Selected Product & Product Picker Modal State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Top Tabs State (using standard UI Tabs)
  const [activeTab, setActiveTab] = useState<string>('COLORS_ANGLES');
  const [selectedColorTabIdx, setSelectedColorTabIdx] = useState<number>(0);

  // Color Presets (persisted in localStorage)
  const [colorPresets, setColorPresets] = useState<Array<{ name: string; hex: string }>>(() => {
    try {
      const saved = localStorage.getItem('showcase_color_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_COLOR_PRESETS;
  });

  const [newPresetName, setNewPresetName] = useState<string>('');
  const [customPresetInput, setCustomPresetInput] = useState<string>('#10b981');

  // Preset editing state
  const [editingPresetIdx, setEditingPresetIdx] = useState<number | null>(null);
  const [editingPresetName, setEditingPresetName] = useState<string>('');
  const [editingPresetHex, setEditingPresetHex] = useState<string>('');

  // Customization Form State per product
  const [primaryColor, setPrimaryColor] = useState<string>('#f3c623');
  const [editorialDescription, setEditorialDescription] = useState<string>('');
  const [colors, setColors] = useState<ColorVariant[]>([]);

  const [features, setFeatures] = useState<ShowcaseFeatureItem[]>([
    { id: 'f1', title: 'AGARRE SUPERIOR', icon: 'zap' },
    { id: 'f2', title: 'DISEÑO ANTIDESLIZANTE', icon: 'grid' },
    { id: 'f3', title: 'MÁXIMA DURABILIDAD', icon: 'shield' },
    { id: 'f4', title: 'ERGONOMÍA PERFECTA', icon: 'ergonomics' },
  ]);

  const [globes, setGlobes] = useState<ShowcaseGlobeItem[]>([
    { id: 'g1', label: 'CILINDRADA', value: '373.2 CC', icon: 'displacement' },
    { id: 'g2', label: 'POTENCIA', value: '40.0 HP', icon: 'power' },
    { id: 'g3', label: 'FRENOS', value: 'ABS DOBLE CANAL', icon: 'brakes' },
    { id: 'g4', label: 'SISTEMA', value: 'INYECCIÓN ELECTRÓNICA FI BOSCH', icon: 'fuel' },
  ]);

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats, tInfo] = await Promise.all([
        productsService.getProducts(activeBranchId),
        catalogService.getCategories(),
        settingsService.getTenantInfo(),
      ]);

      const productList = prods || [];
      setProducts(productList);
      setCategories(cats || []);
      setTenantInfo(tInfo || {});

      if (productList.length > 0) {
        const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
        const urlPid = searchParams.get('p') || searchParams.get('productId');
        const targetId = selectedProductId || urlPid || productList[0].id;
        const targetProd = productList.find(p => String(p.id) === String(targetId)) || productList[0];
        setSelectedProductId(targetProd.id);
        populateProductForm(targetProd);
      }
    } catch (err) {
      console.error('Error loading catalog maintainer data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  // Populate form when selected product changes
  const populateProductForm = (prod: Product) => {
    if (!prod) return;

    let localBackup: any = null;
    try {
      const raw = localStorage.getItem(`showcase_config_${prod.id}`);
      if (raw) localBackup = JSON.parse(raw);
    } catch (e) {}

    // Load colors with their respective 3 angle photos
    const sourceColors = (prod.colors && prod.colors.length > 0) ? prod.colors : (localBackup?.colors || []);
    if (sourceColors.length > 0) {
      setColors(sourceColors.map((c: any, idx: number) => {
        const angles = c.galleryAngles && c.galleryAngles.length === 3 ? c.galleryAngles : [
          { id: 0, label: 'Vista Principal', is360: true, img: c.imagePath || (idx === 0 ? prod.imagePath || '' : '') },
          { id: 1, label: 'Detalle Lateral', is360: false, img: c.imagePath || (idx === 0 ? prod.imagePath || '' : '') },
          { id: 2, label: 'Detalle Chasis', is360: false, img: c.imagePath || (idx === 0 ? prod.imagePath || '' : '') },
        ];
        return {
          color: c.color,
          hex: c.hex,
          stock: c.stock ?? 1,
          imagePath: c.imagePath || (idx === 0 ? prod.imagePath || '' : ''),
          galleryAngles: angles,
        };
      }));
    } else {
      setColors([
        { 
          color: 'Rojo Racing', 
          hex: '#dc2626', 
          stock: 2, 
          imagePath: prod.imagePath || '',
          galleryAngles: [
            { id: 0, label: 'Vista Principal', is360: true, img: prod.imagePath || '' },
            { id: 1, label: 'Detalle Lateral', is360: false, img: prod.imagePath || '' },
            { id: 2, label: 'Detalle Chasis', is360: false, img: prod.imagePath || '' },
          ]
        },
        { 
          color: 'Negro Ébano', 
          hex: '#111827', 
          stock: 3, 
          imagePath: '',
          galleryAngles: [
            { id: 0, label: 'Vista Principal', is360: true, img: '' },
            { id: 1, label: 'Detalle Lateral', is360: false, img: '' },
            { id: 2, label: 'Detalle Chasis', is360: false, img: '' },
          ]
        },
      ]);
    }

    setSelectedColorTabIdx(0);

    // Load Features
    const savedFeatures = (prod as any).showcaseFeatures || (prod as any).features || localBackup?.features;
    if (savedFeatures && Array.isArray(savedFeatures) && savedFeatures.length >= 4) {
      setFeatures(savedFeatures.slice(0, 4));
    } else {
      setFeatures([
        { id: 'f1', title: 'AGARRE SUPERIOR', icon: 'zap' },
        { id: 'f2', title: 'DISEÑO ANTIDESLIZANTE', icon: 'grid' },
        { id: 'f3', title: 'MÁXIMA DURABILIDAD', icon: 'shield' },
        { id: 'f4', title: 'ERGONOMÍA PERFECTA', icon: 'ergonomics' },
      ]);
    }

    // Load Globes
    const savedGlobes = (prod as any).showcaseGlobes || (prod as any).globes || localBackup?.globes;
    const defaultSpecs = (prod as any).specs || {};
    if (savedGlobes && Array.isArray(savedGlobes) && savedGlobes.length >= 4) {
      setGlobes(savedGlobes.slice(0, 4));
    } else {
      setGlobes([
        { id: 'g1', label: 'CILINDRADA', value: defaultSpecs.displacement || '373.2 CC', icon: 'displacement' },
        { id: 'g2', label: 'POTENCIA', value: defaultSpecs.power || '40.0 HP', icon: 'power' },
        { id: 'g3', label: 'FRENOS', value: defaultSpecs.brakes || 'ABS DOBLE CANAL', icon: 'brakes' },
        { id: 'g4', label: 'SISTEMA', value: defaultSpecs.fuelSystem || 'INYECCIÓN ELECTRÓNICA FI BOSCH', icon: 'fuel' },
      ]);
    }

    // Primary Color
    const savedPrimary = (prod as any).primaryColor || (prod as any).showcasePrimaryColor || localBackup?.primaryColor || '#f3c623';
    setPrimaryColor(savedPrimary);

    // Editorial Description
    const savedDesc = (prod as any).editorialDescription || prod.description || localBackup?.editorialDescription || '';
    setEditorialDescription(savedDesc);
  };

  const selectedProduct = useMemo(() => {
    return products.find(p => String(p.id) === String(selectedProductId)) || products[0] || null;
  }, [products, selectedProductId]);

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    const prod = products.find(p => String(p.id) === String(id));
    if (prod) {
      populateProductForm(prod);
    }
    setIsProductPickerOpen(false);
  };

  // Filter products for the picker modal
  const filteredProductsForPicker = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  }, [products, productSearchQuery]);

  // Color Preset Storage & Handlers
  const savePresetsToStorage = (updated: Array<{ name: string; hex: string }>) => {
    setColorPresets(updated);
    try {
      localStorage.setItem('showcase_color_presets', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleStartEditPreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetIdx(idx);
    setEditingPresetName(colorPresets[idx].name);
    setEditingPresetHex(colorPresets[idx].hex);
  };

  const handleSaveEditPreset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingPresetIdx === null) return;
    const updated = [...colorPresets];
    const oldHex = updated[editingPresetIdx].hex;
    updated[editingPresetIdx] = {
      name: editingPresetName.trim() || `Tono ${editingPresetIdx + 1}`,
      hex: editingPresetHex,
    };
    savePresetsToStorage(updated);
    if (primaryColor.toLowerCase() === oldHex.toLowerCase()) {
      setPrimaryColor(editingPresetHex);
    }
    setEditingPresetIdx(null);
  };

  const handleCancelEditPreset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetIdx(null);
  };

  const handleDeletePreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (colorPresets.length <= 1) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debe existir al menos un color registrado.' });
      return;
    }
    const target = colorPresets[idx];
    const updated = colorPresets.filter((_, i) => i !== idx);
    savePresetsToStorage(updated);
    if (primaryColor.toLowerCase() === target.hex.toLowerCase()) {
      setPrimaryColor(updated[0].hex);
    }
  };

  const handleAddCustomColorPreset = () => {
    if (!customPresetInput) return;
    const name = newPresetName.trim() || `Tono ${colorPresets.length + 1}`;
    const exists = colorPresets.some(p => p.hex.toLowerCase() === customPresetInput.toLowerCase());
    if (!exists) {
      const updated = [...colorPresets, { name, hex: customPresetInput }];
      savePresetsToStorage(updated);
    }
    setPrimaryColor(customPresetInput);
    setNewPresetName('');
  };

  // Color Management Helpers
  const handleAddColor = () => {
    const newColor: ColorVariant = {
      color: 'Nuevo Color',
      hex: '#2563eb',
      stock: 1,
      imagePath: selectedProduct?.imagePath || '',
      galleryAngles: [
        { id: 0, label: 'Vista Principal', is360: true, img: selectedProduct?.imagePath || '' },
        { id: 1, label: 'Detalle Lateral', is360: false, img: selectedProduct?.imagePath || '' },
        { id: 2, label: 'Detalle Chasis', is360: false, img: selectedProduct?.imagePath || '' },
      ]
    };
    setColors(prev => [...prev, newColor]);
    setSelectedColorTabIdx(colors.length);
  };

  const handleUpdateColor = (index: number, field: keyof ColorVariant, value: any) => {
    setColors(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleUpdateColorAngle = (colorIdx: number, angleIdx: number, field: 'label' | 'img' | 'is360', value: any) => {
    setColors(prev => {
      const next = [...prev];
      const currentColor = { ...next[colorIdx] };
      const currentAngles = currentColor.galleryAngles ? [...currentColor.galleryAngles] : [
        { id: 0, label: 'Vista Principal', is360: true, img: '' },
        { id: 1, label: 'Detalle Lateral', is360: false, img: '' },
        { id: 2, label: 'Detalle Chasis', is360: false, img: '' },
      ];
      currentAngles[angleIdx] = { ...currentAngles[angleIdx], [field]: value };
      currentColor.galleryAngles = currentAngles;
      if (angleIdx === 0 && field === 'img') {
        currentColor.imagePath = value;
      }
      next[colorIdx] = currentColor;
      return next;
    });
  };

  const handleRemoveColor = (index: number) => {
    if (colors.length <= 1) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debe existir al menos un color registrado.' });
      return;
    }
    setColors(prev => prev.filter((_, idx) => idx !== index));
    if (selectedColorTabIdx >= colors.length - 1) {
      setSelectedColorTabIdx(Math.max(0, colors.length - 2));
    }
  };

  // Save changes to Database
  const handleSaveShowcaseSettings = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);

    try {
      const updatedProductData: Partial<Product> = {
        ...selectedProduct,
        colors: colors,
        imagePath: colors[0]?.imagePath || selectedProduct.imagePath,
        galleryAngles: colors[0]?.galleryAngles as any,
        showcaseFeatures: features as any,
        showcaseGlobes: globes as any,
        primaryColor: primaryColor as any,
        editorialDescription: editorialDescription,
        description: editorialDescription,
      } as any;

      await productsService.updateProduct(selectedProduct.id, updatedProductData);

      try {
        localStorage.setItem(`showcase_config_${selectedProduct.id}`, JSON.stringify({
          colors,
          galleryAngles: colors[0]?.galleryAngles,
          features,
          globes,
          primaryColor,
          editorialDescription,
        }));
      } catch (e) {}

      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, ...updatedProductData } : p));

      Swal.fire({
        icon: 'success',
        title: '¡Showcase Guardado!',
        text: `Configuraciones guardadas para el modelo ${selectedProduct.name}.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Error saving showcase settings:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error al Guardar',
        text: 'Ocurrió un inconveniente al actualizar los datos.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const previewProduct = useMemo(() => {
    if (!selectedProduct) return null;
    return {
      ...selectedProduct,
      colors: colors,
      imagePath: colors[0]?.imagePath || selectedProduct.imagePath,
      editorialDescription: editorialDescription,
      description: editorialDescription,
    };
  }, [selectedProduct, colors, editorialDescription]);

  // Generate Clean Tenant Slug & Public URL
  const tenantSlug = useMemo(() => {
    const raw = tenantInfo?.trade_name || tenantInfo?.name || localStorage.getItem('tenant_name') || 'catalogo';
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'catalogo';
  }, [tenantInfo]);

  const publicCatalogUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ventas-bv.vercel.app';
    return `${origin}/#/${tenantSlug}/catalogo`;
  }, [tenantSlug]);

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicCatalogUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      Swal.fire({
        icon: 'success',
        title: '¡Enlace Copiado al Portapapeles!',
        text: publicCatalogUrl,
        timer: 2500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const tabsConfig = [
    { id: 'COLORS_ANGLES', label: `Fotos por Color & Vistas (${colors.length})`, icon: <Palette size={15} /> },
    { id: 'FEATURES', label: 'Texto & Características', icon: <Zap size={15} /> },
    { id: 'GLOBES', label: '4 Globos Telemetría', icon: <Gauge size={15} /> },
    { id: 'PREVIEW', label: 'Vista Previa en Vivo', icon: <Eye size={15} /> },
  ];

  return (
    <div className="space-y-6 pb-16 font-sans">
      
      {/* Standard Reusable PageHeader Component */}
      <PageHeader
        eyebrow="CATÁLOGO & SHOWCASE"
        title="Mantenedor de Catálogo Digital"
        description="Personaliza fotografías por variante de color, vistas 360°, características destacadas y especificaciones técnicas para la vista pública de clientes."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPublicLink}
              icon={copiedLink ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
              title="Copiar URL para compartir con tus clientes"
            >
              {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
            </Button>

            <a
              href={`#/${tenantSlug}/catalogo${selectedProductId ? `?p=${selectedProductId}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<ExternalLink size={14} style={{ color: primaryColor }} />}
              >
                Abrir Vista Cliente
              </Button>
            </a>

            <Button
              variant="primary"
              size="sm"
              loading={isSaving}
              onClick={handleSaveShowcaseSettings}
              icon={<Save size={15} />}
            >
              Guardar Configuración
            </Button>
          </div>
        }
      />

      {/* Public URL & Multi-Tenant Sharing Banner */}
      <div className="bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/60 text-primary-600 flex items-center justify-center shrink-0">
            <Globe size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase">Enlace Público de tu Empresa / Tienda</span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0.5 font-bold">Activo 24/7</Badge>
            </div>
            <p className="text-xs font-mono text-secondary truncate mt-0.5" title={publicCatalogUrl}>
              {publicCatalogUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPublicLink}
            icon={copiedLink ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
            className="flex-1 sm:flex-none font-bold text-xs"
          >
            {copiedLink ? '¡Copiado!' : 'Copiar Enlace'}
          </Button>
          <a
            href={`#/${tenantSlug}/catalogo`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none"
          >
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={14} style={{ color: primaryColor }} />}
              className="w-full font-bold text-xs"
            >
              Abrir Catálogo
            </Button>
          </a>
        </div>
      </div>

      {/* Main Maintainer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL (4 Cols): Clickable Product Card & 3 Default Colors */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Clickable Product Card */}
          <Card>
            <CardHeader
              title="1. Producto Seleccionado"
              subtitle="Haz clic en la tarjeta para cambiar"
              action={
                <Badge variant="primary">
                  {selectedProduct?.brand || 'Catálogo'}
                </Badge>
              }
            />
            <CardBody className="space-y-3">
              {selectedProduct ? (
                <div
                  onClick={() => setIsProductPickerOpen(true)}
                  className="group relative p-3.5 rounded-2xl flex items-center gap-3.5 transition-all cursor-pointer border"
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    borderColor: 'var(--border-color)',
                  }}
                  title="Clic para seleccionar otro producto del catálogo"
                >
                  {selectedProduct.imagePath ? (
                    <img
                      src={selectedProduct.imagePath}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-contain rounded-xl p-1 border group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                    >
                      <ImageIcon size={22} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 pr-6">
                    <span 
                      style={{ color: primaryColor }}
                      className="text-[10px] font-black uppercase tracking-wider block truncate"
                    >
                      {selectedProduct.category || 'MOTOS'}
                    </span>
                    <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {selectedProduct.brand} {selectedProduct.name}
                    </div>
                    <div className="text-xs font-mono text-emerald-600 font-bold mt-0.5">
                      S/ {selectedProduct.price.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>
                    <ChevronDown size={18} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsProductPickerOpen(true)}
                  className="w-full py-4 text-center border-2 border-dashed rounded-2xl text-xs font-bold transition-colors"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  + Seleccionar Producto
                </button>
              )}
            </CardBody>
          </Card>

          {/* Primary Color Palette Card (with full edit & delete capabilities) */}
          <Card>
            <CardHeader
              title="2. Color Primario de Marca"
              subtitle="Colores predefinidos o personalizados"
              action={
                <div 
                  className="w-5 h-5 rounded-full border shadow-xs"
                  style={{ backgroundColor: primaryColor, borderColor: 'var(--border-color)' }}
                />
              }
            />
            <CardBody className="space-y-4">
              
              {/* Preset Color Pills Grid with Edit & Delete */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                  Tonos Guardados:
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {colorPresets.map((preset, idx) => {
                    const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
                    const isEditing = editingPresetIdx === idx;

                    if (isEditing) {
                      return (
                        <div 
                          key={idx}
                          className="col-span-full p-2.5 rounded-xl border space-y-2 shadow-xs"
                          style={{ backgroundColor: 'var(--bg-app)', borderColor: primaryColor }}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingPresetHex}
                              onChange={(e) => setEditingPresetHex(e.target.value)}
                              className="w-8 h-8 rounded-lg border cursor-pointer shrink-0"
                              style={{ borderColor: 'var(--border-color)' }}
                            />
                            <input
                              type="text"
                              value={editingPresetName}
                              onChange={(e) => setEditingPresetName(e.target.value)}
                              placeholder="Nombre del tono"
                              className="platform-input flex-1 text-xs font-semibold"
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditPreset}
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                              title="Guardar cambios"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditPreset}
                              className="p-2 bg-neutral-200 dark:bg-neutral-800 text-secondary hover:text-primary rounded-lg transition-colors cursor-pointer"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => setPrimaryColor(preset.hex)}
                        title={`Clic para activar ${preset.name} (${preset.hex})`}
                        style={{
                          backgroundColor: isSelected ? 'var(--bg-app)' : 'var(--bg-surface)',
                          borderColor: isSelected ? primaryColor : 'var(--border-color)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                        className={`group relative flex items-center justify-between gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected ? 'ring-2 shadow-xs' : 'hover:border-color'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span 
                            className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0 border" 
                            style={{ backgroundColor: preset.hex, borderColor: 'rgba(0,0,0,0.15)' }} 
                          />
                          <span className="text-[11px] font-bold truncate">
                            {preset.name}
                          </span>
                        </div>

                        {/* Action buttons (Edit / Delete) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleStartEditPreset(idx, e)}
                            title="Editar este color"
                            className="p-1 hover:text-amber-500 rounded transition-colors"
                          >
                            <Pencil size={11} />
                          </button>
                          {colorPresets.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePreset(idx, e)}
                              title="Eliminar este color"
                              className="p-1 hover:text-rose-500 rounded transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Color / Native Color Picker */}
              <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                  Añadir nuevo tono:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customPresetInput}
                    onChange={(e) => setCustomPresetInput(e.target.value)}
                    className="w-9 h-9 rounded-xl border cursor-pointer shrink-0"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
                    title="Elegir color personalizado"
                  />
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nombre (ej. Naranja Solar)"
                    className="platform-input flex-1 text-xs font-semibold"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddCustomColorPreset}
                    icon={<Plus size={13} />}
                  >
                    Añadir
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

        </div>

        {/* RIGHT PANEL (8 Cols): Configuration Tabs (Colors & 3 Angles per Color, Features, Globes, Live Preview) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Standard Navigation Tabs using project's native Tabs component */}
          <Tabs
            tabs={tabsConfig}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId)}
            variant="pills"
          />

          {/* TAB 1: FOTOS POR COLOR & 3 VISTAS POR CADA COLOR */}
          {activeTab === 'COLORS_ANGLES' && (
            <ColorAngleManager
              colors={colors}
              selectedColorIndex={selectedColorTabIdx}
              onSelectColorIndex={setSelectedColorTabIdx}
              onAddColor={handleAddColor}
              onUpdateColor={handleUpdateColor}
              onUpdateColorAngle={handleUpdateColorAngle}
              onRemoveColor={handleRemoveColor}
              primaryColor={primaryColor}
            />
          )}

          {/* TAB 2: TEXTO EDITORIAL & 4 CARACTERÍSTICAS DESTACADAS */}
          {activeTab === 'FEATURES' && (
            <div className="space-y-5">
              {/* Card Párrafo Editorial de Cabecera */}
              <Card>
                <CardHeader
                  title="Texto Editorial / Descripción de Cabecera"
                  subtitle="Personaliza el texto explicativo que aparece debajo del título y precio del modelo en el showcase"
                />
                <CardBody className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                        Párrafo Editorial del Modelo:
                      </label>
                      <span className="text-[10.5px] font-semibold" style={{ color: primaryColor }}>
                        {editorialDescription ? `${editorialDescription.length} caracteres` : 'Texto automático activo'}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={editorialDescription}
                      onChange={(e) => setEditorialDescription(e.target.value)}
                      placeholder={`Ej. La nueva ${selectedProduct?.brand || ''} ${selectedProduct?.model || selectedProduct?.name || ''} no solo tiene un motor potente con tecnología de vanguardia, sino que viene equipada con frenado de alta precisión y suspensión para máximo confort.`}
                      className="platform-input text-xs leading-relaxed rounded-xl w-full p-3 font-medium resize-y"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <span>💡 <em>Si lo dejas vacío, el sistema generará automáticamente el texto predeterminado según la marca, modelo y especificaciones.</em></span>
                    {editorialDescription && (
                      <button
                        type="button"
                        onClick={() => setEditorialDescription('')}
                        className="text-xs font-semibold hover:underline text-rose-500 cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        Restablecer a texto automático
                      </button>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Card 4 Características Destacadas */}
              <Card>
                <CardHeader
                  title="4 Características Destacadas"
                  subtitle="Personaliza el título e icono de las 4 tarjetas que aparecen en la cabecera del modelo"
                />
                <CardBody className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {features.map((feat, idx) => {
                    const currentIconObj = AVAILABLE_ICONS.find(i => i.id === feat.icon);
                    return (
                      <div 
                        key={feat.id || idx} 
                        className="p-4 rounded-2xl space-y-3.5 border transition-all"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                            <span 
                              style={{ color: primaryColor }}
                              className="text-xs font-black uppercase tracking-wider"
                            >
                              Tarjeta {idx + 1}
                            </span>
                          </div>
                          <div 
                            style={{ 
                              backgroundColor: `${primaryColor}18`, 
                              borderColor: `${primaryColor}50`,
                              color: primaryColor,
                            }}
                            className="p-1.5 rounded-xl border flex items-center justify-center shadow-2xs"
                            title={currentIconObj?.label || 'Icono actual'}
                          >
                            {currentIconObj?.icon || <Zap size={15} />}
                          </div>
                        </div>

                        {/* Title input */}
                        <div className="space-y-1.5">
                          <label className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                            Título de Característica:
                          </label>
                          <input
                            type="text"
                            value={feat.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFeatures(prev => {
                                const next = [...prev];
                                next[idx].title = val;
                                return next;
                              });
                            }}
                            placeholder="ej. AGARRE SUPERIOR"
                            className="platform-input text-xs font-bold uppercase rounded-xl"
                          />
                        </div>

                        {/* Visual Icon Picker Grid */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                              Elegir Icono:
                            </label>
                            <span className="text-[10px] font-semibold" style={{ color: primaryColor }}>
                              {currentIconObj?.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}>
                            {AVAILABLE_ICONS.map((iconOpt) => {
                              const isSelected = feat.icon === iconOpt.id;
                              return (
                                <button
                                  key={iconOpt.id}
                                  type="button"
                                  onClick={() => {
                                    setFeatures(prev => {
                                      const next = [...prev];
                                      next[idx].icon = iconOpt.id;
                                      return next;
                                    });
                                  }}
                                  title={iconOpt.label}
                                  style={{
                                    backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                                    borderColor: isSelected ? primaryColor : 'transparent',
                                    color: isSelected ? primaryColor : 'var(--text-secondary)',
                                  }}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'shadow-xs scale-105 ring-1' 
                                      : 'hover:bg-surface hover:text-primary hover:border-border-color'
                                  }`}
                                >
                                  {iconOpt.icon}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
            </div>
          )}

          {/* TAB 3: 4 GLOBOS DE TELEMETRÍA */}
          {activeTab === 'GLOBES' && (
            <Card>
              <CardHeader
                title="4 Globos Flotantes de Telemetría"
                subtitle="Edita las etiquetas, valores e iconos de los 4 globos orbitales que rodean la imagen central"
              />
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {globes.map((globe, idx) => {
                    const globePositions = [
                      'Globo 1 (Superior Izquierda)',
                      'Globo 2 (Inferior Izquierda)',
                      'Globo 3 (Superior Derecha)',
                      'Globo 4 (Inferior Derecha)'
                    ];
                    const currentGlobeIconObj = GLOBE_ICONS.find(i => i.id === globe.icon);
                    return (
                      <div 
                        key={globe.id || idx} 
                        className="p-4 rounded-2xl space-y-3.5 border transition-all"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                            <span 
                              style={{ color: primaryColor }}
                              className="text-xs font-black uppercase tracking-wider"
                            >
                              {globePositions[idx]}
                            </span>
                          </div>
                          <div 
                            style={{ 
                              backgroundColor: `${primaryColor}18`, 
                              borderColor: `${primaryColor}50`,
                              color: primaryColor,
                            }}
                            className="p-1.5 rounded-xl border flex items-center justify-center shadow-2xs"
                            title={currentGlobeIconObj?.label || 'Icono actual'}
                          >
                            {currentGlobeIconObj?.icon || <Gauge size={15} />}
                          </div>
                        </div>

                        {/* Label input */}
                        <div className="space-y-1.5">
                          <label className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                            Etiqueta:
                          </label>
                          <input
                            type="text"
                            value={globe.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGlobes(prev => {
                                const next = [...prev];
                                next[idx].label = val;
                                return next;
                              });
                            }}
                            placeholder="ej. CILINDRADA"
                            className="platform-input text-xs font-bold uppercase rounded-xl"
                          />
                        </div>

                        {/* Value input */}
                        <div className="space-y-1.5">
                          <label className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                            Valor a Mostrar:
                          </label>
                          <input
                            type="text"
                            value={globe.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGlobes(prev => {
                                const next = [...prev];
                                next[idx].value = val;
                                return next;
                              });
                            }}
                            placeholder="ej. 373.2 CC"
                            className="platform-input text-xs font-mono font-bold rounded-xl"
                          />
                        </div>

                        {/* Visual Icon Picker Grid */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                              Elegir Icono:
                            </label>
                            <span className="text-[10px] font-semibold" style={{ color: primaryColor }}>
                              {currentGlobeIconObj?.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}>
                            {GLOBE_ICONS.map((opt) => {
                              const isSelected = globe.icon === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setGlobes(prev => {
                                      const next = [...prev];
                                      next[idx].icon = opt.id;
                                      return next;
                                    });
                                  }}
                                  title={opt.label}
                                  style={{
                                    backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                                    borderColor: isSelected ? primaryColor : 'transparent',
                                    color: isSelected ? primaryColor : 'var(--text-secondary)',
                                  }}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'shadow-xs scale-105 ring-1' 
                                      : 'hover:bg-surface hover:text-primary hover:border-border-color'
                                  }`}
                                >
                                  {opt.icon}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* TAB 4: VISTA PREVIA EN VIVO */}
          {activeTab === 'PREVIEW' && (
            <Card>
              <CardHeader
                title="Vista Previa del Showcase en Tiempo Real"
                subtitle="Comprueba cómo verá el cliente final todas tus configuraciones aplicadas"
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isSaving}
                    onClick={handleSaveShowcaseSettings}
                    icon={<Save size={14} />}
                  >
                    Guardar Cambios
                  </Button>
                }
              />
              <CardBody className="p-0 sm:p-2">
                {previewProduct ? (
                  <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                    <SomomotoHeroShowcase
                      products={[previewProduct]}
                      currentIndex={0}
                      onSelectIndex={() => {}}
                      onOpenWhatsApp={() => {}}
                      primaryColor={primaryColor}
                      customFeatures={features}
                      customGlobes={globes}
                      customEditorialDescription={editorialDescription}
                      companyName={tenantInfo.trade_name || tenantInfo.name || 'VENTAS B&V'}
                    />
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Selecciona un producto para ver la vista previa.
                  </div>
                )}
              </CardBody>
            </Card>
          )}

        </div>

      </div>

      {/* Product Selector Search Modal */}
      {isProductPickerOpen && (
        <Modal
          isOpen={isProductPickerOpen}
          onClose={() => setIsProductPickerOpen(false)}
          title="Seleccionar Producto del Catálogo"
          size="lg"
        >
          <div className="space-y-4">
            <SearchInput
              value={productSearchQuery}
              onChangeValue={setProductSearchQuery}
              placeholder="Buscar por modelo, marca o código..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredProductsForPicker.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p.id)}
                    className="p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-app)' : 'var(--bg-surface)',
                      borderColor: isSelected ? primaryColor : 'var(--border-color)',
                    }}
                  >
                    {p.imagePath ? (
                      <img
                        src={p.imagePath}
                        alt={p.name}
                        className="w-14 h-14 object-contain rounded-xl p-1 border shrink-0"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                      />
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                      >
                        <ImageIcon size={20} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <span 
                        style={{ color: primaryColor }}
                        className="text-[10px] font-bold uppercase tracking-wider block truncate"
                      >
                        {p.category || 'MOTOS'}
                      </span>
                      <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.brand} {p.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-mono font-bold text-emerald-600">
                          S/ {p.price.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                        </span>
                        {p.code && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            {p.code}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={18} style={{ color: primaryColor }} className="shrink-0" />
                    )}
                  </div>
                );
              })}

              {filteredProductsForPicker.length === 0 && (
                <div className="col-span-2 py-10 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No se encontraron productos con el término "{productSearchQuery}".
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
