import React from 'react';

interface BVLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'slogan' | 'ventas';
  theme?: 'blue' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  height?: number | string;
  className?: string;
  lightMode?: boolean;
}

export const BVLogo: React.FC<BVLogoProps> = ({
  variant = 'ventas',
  theme = 'gold',
  size = 'md',
  height,
  className = '',
  lightMode = false
}) => {
  const isGold = theme === 'gold';
  
  // Height calculation based on size if height is not explicitly passed
  const calcHeight = height || (size === 'sm' ? 36 : size === 'md' ? 56 : size === 'lg' ? 84 : 112);
  const ratio = variant === 'icon' ? 1.4 : variant === 'ventas' ? 2.4 : 3.0; // aspect ratio width/height
  const numericHeight = typeof calcHeight === 'number' ? calcHeight : parseInt(String(calcHeight), 10) || 56;
  const numericWidth = Math.round(numericHeight * ratio);

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={numericWidth}
        height={numericHeight}
        viewBox="0 0 380 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-300 transform hover:scale-[1.01]"
      >
        <defs>
          {/* Metallic Silver Gradient for B and V */}
          <linearGradient id="bvMetallicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#F1F5F9" />
            <stop offset="70%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Light Mode Metallic Silver */}
          <linearGradient id="bvMetallicGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Electric Blue Gradient for Ampersand & */}
          <linearGradient id="bvAmpersandGradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A3FF" />
            <stop offset="40%" stopColor="#0066FF" />
            <stop offset="100%" stopColor="#0044CC" />
          </linearGradient>

          {/* Gold Yellow Gradient for Ampersand & and Ventas */}
          <linearGradient id="bvAmpersandGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="35%" stopColor="#FFB800" />
            <stop offset="75%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Cyan Glow for Tech Pixels */}
          <linearGradient id="bvPixelCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#00A3FF" />
          </linearGradient>

          {/* Blue Glow for Tech Pixels */}
          <linearGradient id="bvPixelBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="100%" stopColor="#0244BC" />
          </linearGradient>

          {/* Gold Glow for Tech Pixels */}
          <linearGradient id="bvPixelGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Soft Shadow Glow Effect */}
          <filter id="bvGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={isGold ? '#FFB800' : '#0066FF'} floodOpacity="0.3" />
          </filter>
        </defs>

        {/* --- MAIN LOGO MARK --- */}
        <g filter="url(#bvGlow)">
          {/* LETTER 'B' */}
          <path
            d="M10 12 H60 C82 12 96 21 96 37 C96 47 90 54 78 58 C94 62 102 71 102 88 C102 106 85 116 62 116 H10 V12 Z M40 33 V51 H58 C68 51 74 47 74 42 C74 37 68 33 58 33 H40 Z M40 71 V95 H62 C73 95 80 90 80 83 C80 76 73 71 62 71 H40 Z"
            fill={lightMode ? 'url(#bvMetallicGradLight)' : 'url(#bvMetallicGrad)'}
          />

          {/* AMPERSAND '&' */}
          <path
            d="M128 116 C112 116 102 106 102 91 C102 77 112 67 126 57 C120 46 118 37 118 30 C118 18 128 10 142 10 C154 10 163 18 163 29 C163 42 149 54 138 63 L161 100 C165 94 167 86 168 78 H186 C184 92 179 105 169 116 H158 L136 80 L123 91 C119 94 117 99 117 102 C117 107 122 110 128 110 C135 110 142 107 148 102 L156 112 C147 120 137 123 128 123 Z M140 22 C135 22 130 26 130 31 C130 37 134 44 139 52 C146 45 151 38 151 31 C151 25 147 22 140 22 Z"
            fill={isGold ? 'url(#bvAmpersandGradGold)' : 'url(#bvAmpersandGradBlue)'}
          />

          {/* LETTER 'V' */}
          <path
            d="M178 12 H206 L234 88 L262 12 H290 L248 116 H220 L178 12 Z"
            fill={lightMode ? 'url(#bvMetallicGradLight)' : 'url(#bvMetallicGrad)'}
          />

          {/* TECH PIXEL EXPLOSION (Top Right of V) */}
          <g>
            <rect x="276" y="18" width="10" height="10" rx="1.5" fill={isGold ? 'url(#bvPixelGoldGrad)' : 'url(#bvPixelCyanGrad)'} />
            <rect x="290" y="10" width="12" height="12" rx="2" fill={isGold ? 'url(#bvAmpersandGradGold)' : 'url(#bvPixelBlueGrad)'} />
            <rect x="306" y="14" width="8" height="8" rx="1" fill={isGold ? 'url(#bvPixelGoldGrad)' : 'url(#bvPixelCyanGrad)'} />
            <rect x="292" y="26" width="9" height="9" rx="1.5" fill={isGold ? 'url(#bvPixelGoldGrad)' : 'url(#bvPixelCyanGrad)'} />
            <rect x="304" y="30" width="11" height="11" rx="2" fill={isGold ? 'url(#bvAmpersandGradGold)' : 'url(#bvPixelBlueGrad)'} />
            <rect x="319" y="6" width="7" height="7" rx="1" fill={isGold ? 'url(#bvPixelGoldGrad)' : 'url(#bvPixelCyanGrad)'} />
            <rect x="318" y="20" width="10" height="10" rx="1.5" fill={isGold ? 'url(#bvAmpersandGradGold)' : 'url(#bvPixelBlueGrad)'} />
            <rect x="332" y="12" width="6" height="6" rx="1" fill={isGold ? 'url(#bvPixelGoldGrad)' : 'url(#bvPixelCyanGrad)'} />
          </g>
        </g>

        {/* --- SHOPPING CART ICON & VENTAS SUBTITLE (Matching reference image) --- */}
        {variant === 'ventas' && (
          <g transform="translate(45, 122)">
            {/* Speed Lines */}
            <path d="M0 8 H12 M4 14 H16 M0 20 H10" stroke={isGold ? '#FFB800' : '#0066FF'} strokeWidth="2.5" strokeLinecap="round" />
            {/* Shopping Cart Body */}
            <path d="M18 6 H24 L30 20 H48 L54 6 H20" stroke={isGold ? '#FFB800' : '#0066FF'} strokeWidth="2.5" strokeLinejoin="round" fill="none" />
            <circle cx="32" cy="25" r="2.5" fill={isGold ? '#FFB800' : '#0066FF'} />
            <circle cx="44" cy="25" r="2.5" fill={isGold ? '#FFB800' : '#0066FF'} />
            {/* 'VENTAS' Text */}
            <text
              x="68"
              y="22"
              fill={isGold ? 'url(#bvAmpersandGradGold)' : '#FFFFFF'}
              fontSize="24"
              fontWeight="900"
              letterSpacing="7"
              fontFamily="'Chivo Variable', 'IBM Plex Sans', sans-serif"
            >
              VENTAS
            </text>
          </g>
        )}

        {/* --- SUBTITLE: SOLUCIONES • TECNOLOGÍAS • SISTEMAS --- */}
        {variant !== 'icon' && (
          <g transform="translate(0, 155)">
            {/* Left Accent Line */}
            <line x1="20" y1="-4" x2="50" y2="-4" stroke={isGold ? '#FFB800' : '#334155'} strokeWidth="1.5" opacity="0.7" />
            <text
              x="190"
              y="0"
              textAnchor="middle"
              fill={lightMode ? '#334155' : isGold ? '#F1F5F9' : '#94A3B8'}
              fontSize="11"
              fontWeight="700"
              letterSpacing="3.5"
              fontFamily="'IBM Plex Sans', sans-serif"
            >
              SOLUCIONES • TECNOLOGÍAS • SISTEMAS
            </text>
            {/* Right Accent Line */}
            <line x1="330" y1="-4" x2="360" y2="-4" stroke={isGold ? '#FFB800' : '#334155'} strokeWidth="1.5" opacity="0.7" />
          </g>
        )}
      </svg>

      {/* SLOGAN BANNER (Optional mode) */}
      {variant === 'slogan' && (
        <div className="mt-1 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-amber-400 uppercase flex items-center gap-1.5 opacity-90">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span>UNA MARCA. INFINITAS SOLUCIONES.</span>
        </div>
      )}
    </div>
  );
};

export default BVLogo;
