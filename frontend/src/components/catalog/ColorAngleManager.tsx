import React from 'react';
import { 
  Upload, Trash2, RotateCw, Image as ImageIcon, Plus, 
  Check, X, Link as LinkIcon 
} from 'lucide-react';
import { ColorVariant } from '../../lib/db-services';
import { Card, CardHeader, CardBody, Button } from '../ui';

interface ColorAngleManagerProps {
  colors: ColorVariant[];
  selectedColorIndex: number;
  onSelectColorIndex: (index: number) => void;
  onAddColor: () => void;
  onUpdateColor: (index: number, field: keyof ColorVariant, value: any) => void;
  onUpdateColorAngle: (colorIdx: number, angleIdx: number, field: 'label' | 'img' | 'is360', value: any) => void;
  onRemoveColor: (index: number) => void;
  primaryColor?: string;
}

export const ColorAngleManager: React.FC<ColorAngleManagerProps> = ({
  colors,
  selectedColorIndex,
  onSelectColorIndex,
  onAddColor,
  onUpdateColor,
  onUpdateColorAngle,
  onRemoveColor,
  primaryColor = '#f3c623',
}) => {
  const currentColor = colors[selectedColorIndex] || colors[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, angleIdx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateColorAngle(selectedColorIndex, angleIdx, 'img', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const angleLabels = [
    { defaultLabel: 'Vista Principal', is360: true, desc: 'Toma principal o 360°' },
    { defaultLabel: 'Detalle Lateral', is360: false, desc: 'Perfil lateral del vehículo' },
    { defaultLabel: 'Detalle Chasis / Frontal', is360: false, desc: 'Frontal o tablero de mandos' },
  ];

  return (
    <div className="space-y-4">
      
      {/* ── 1. Color Selector Bar (Segmented Control Pills matching Image 2) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        
        {/* Pills container matching Image 2 (tab-list-pills) */}
        <div className="tab-list-pills p-1 inline-flex items-center gap-1.5 flex-wrap">
          {colors.map((c, idx) => {
            const isActive = selectedColorIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectColorIndex(idx)}
                className={`tab-btn-pill flex items-center gap-2 ${isActive ? 'active' : ''}`}
                style={isActive ? {
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-sm)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                } : {}}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border shrink-0 shadow-2xs"
                  style={{ backgroundColor: c.hex || '#111827', borderColor: 'rgba(0,0,0,0.15)' }}
                />
                <span className="truncate max-w-[130px] font-semibold text-xs">
                  {c.color || `Color ${idx + 1}`}
                </span>
                {isActive && (
                  <Check size={13} style={{ color: primaryColor }} className="shrink-0 font-bold" />
                )}
              </button>
            );
          })}
        </div>

        {/* Add Color Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddColor}
          icon={<Plus size={14} />}
        >
          Añadir Color
        </Button>
      </div>

      {/* ── 2. Active Color Configuration Card ── */}
      {currentColor && (
        <Card>
          <CardHeader
            title={`Configuración de Variante: ${currentColor.color}`}
            subtitle="Personaliza el nombre, stock y las 3 tomas de este color"
            action={
              <Button
                variant="danger"
                size="sm"
                onClick={() => onRemoveColor(selectedColorIndex)}
                icon={<Trash2 size={14} />}
              >
                Eliminar Color
              </Button>
            }
          />
          <CardBody className="space-y-6">
            
            {/* Color Settings Header Bar */}
            <div 
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border"
              style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}
            >
              
              {/* Color Swatch & Name */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <input
                  type="color"
                  value={currentColor.hex || '#111827'}
                  onChange={(e) => onUpdateColor(selectedColorIndex, 'hex', e.target.value)}
                  className="w-10 h-10 rounded-xl border cursor-pointer shrink-0"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
                  title="Clic para cambiar el tono de este color"
                />

                <div className="flex-1 min-w-0">
                  <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Nombre del Color:
                  </label>
                  <input
                    type="text"
                    value={currentColor.color}
                    onChange={(e) => onUpdateColor(selectedColorIndex, 'color', e.target.value)}
                    placeholder="ej. Rojo Racing, Negro Ébano"
                    className="platform-input w-full sm:w-64 text-xs font-semibold rounded-xl"
                  />
                </div>
              </div>

              {/* Stock */}
              <div className="flex items-center gap-3 shrink-0">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Stock Disponible:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentColor.stock ?? 0}
                    onChange={(e) => onUpdateColor(selectedColorIndex, 'stock', Number(e.target.value))}
                    className="platform-input w-24 text-xs font-bold text-center rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ── 3. The 3 Angle Cards for This Specific Color ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <RotateCw size={15} style={{ color: primaryColor }} />
                  <span>3 Ángulos de Fotografía para <strong style={{ color: primaryColor }}>"{currentColor.color}"</strong></span>
                </h4>
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Recomendado: PNG sin fondo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((angleIdx) => {
                  const angle = currentColor.galleryAngles?.[angleIdx] || {
                    id: angleIdx,
                    label: angleLabels[angleIdx].defaultLabel,
                    is360: angleLabels[angleIdx].is360,
                    img: angleIdx === 0 ? currentColor.imagePath || '' : ''
                  };

                  const isDataUrl = angle.img?.startsWith('data:image');
                  const displayUrl = isDataUrl ? 'Archivo local cargado' : (angle.img || '');

                  return (
                    <div 
                      key={angleIdx} 
                      className="rounded-2xl p-4 flex flex-col justify-between space-y-3.5 border transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-surface)', 
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      
                      {/* Header with Title & Badge */}
                      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                            Vista {angleIdx + 1}
                          </span>
                        </div>
                        {angle.is360 ? (
                          <span 
                            style={{ 
                              backgroundColor: `${primaryColor}25`,
                              borderColor: `${primaryColor}60`,
                              color: primaryColor,
                            }}
                            className="px-2 py-0.5 font-black text-[9.5px] rounded-md uppercase border flex items-center gap-1 shadow-2xs"
                          >
                            <RotateCw size={10} /> 360°
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            {angleIdx === 1 ? 'Lateral' : 'Chasis'}
                          </span>
                        )}
                      </div>

                      {/* Label Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10.5px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                          Etiqueta de la Vista:
                        </label>
                        <input
                          type="text"
                          value={angle.label}
                          onChange={(e) => onUpdateColorAngle(selectedColorIndex, angleIdx, 'label', e.target.value)}
                          placeholder={angleLabels[angleIdx].defaultLabel}
                          className="platform-input text-xs font-semibold rounded-xl"
                        />
                      </div>

                      {/* Image Preview Box */}
                      <div 
                        className="relative h-36 rounded-xl border border-dashed flex items-center justify-center p-2 group overflow-hidden"
                        style={{ 
                          backgroundColor: 'var(--bg-app)', 
                          borderColor: 'var(--border-color)',
                        }}
                      >
                        {angle.img ? (
                          <>
                            <img 
                              src={angle.img} 
                              alt={angle.label} 
                              className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105" 
                            />
                            <button
                              type="button"
                              onClick={() => onUpdateColorAngle(selectedColorIndex, angleIdx, 'img', '')}
                              className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                              title="Quitar foto"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-xs text-center p-2" style={{ color: 'var(--text-muted)' }}>
                            <ImageIcon size={26} className="mb-1 opacity-60" />
                            <span className="font-semibold text-[11px]">Sin fotografía cargada</span>
                          </div>
                        )}
                      </div>

                      {/* Upload Actions & URL Input */}
                      <div className="space-y-2 pt-1">
                        <div 
                          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border"
                          style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}
                        >
                          <LinkIcon size={12} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                          <input
                            type="text"
                            value={isDataUrl ? '' : displayUrl}
                            onChange={(e) => onUpdateColorAngle(selectedColorIndex, angleIdx, 'img', e.target.value)}
                            placeholder={isDataUrl ? 'Archivo local cargado' : 'Pegar URL de imagen...'}
                            className="w-full text-[11px] bg-transparent focus:outline-none font-mono"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>

                        <label 
                          className="w-full btn btn-secondary btn-sm flex items-center justify-center gap-1.5 cursor-pointer rounded-xl font-semibold text-xs"
                        >
                          <Upload size={13} style={{ color: primaryColor }} />
                          <span>{angle.img ? 'Reemplazar Foto' : 'Subir Archivo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, angleIdx)}
                            className="hidden"
                          />
                        </label>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </CardBody>
        </Card>
      )}

    </div>
  );
};
