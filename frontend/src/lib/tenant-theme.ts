export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  pageBg: string;
  sidebarBg: string;
  sidebarText: string;
  surfaceBg: string;
}

export const PRESETS: Record<string, { id: string; name: string; colors: ThemeColors }> = {
  default: {
    id: 'default',
    name: 'Azul Clásico',
    colors: {
      primaryColor: '#2563eb',
      secondaryColor: '#10b981',
      pageBg: '#f1f5f9',
      sidebarBg: '#0f172a',
      sidebarText: '#94a3b8',
      surfaceBg: '#ffffff',
    },
  },
  indigo_gold: {
    id: 'indigo_gold',
    name: 'Indigo & Dorado',
    colors: {
      primaryColor: '#4f46e5',
      secondaryColor: '#f59e0b',
      pageBg: '#f8fafc',
      sidebarBg: '#1e1b4b',
      sidebarText: '#c7d2fe',
      surfaceBg: '#ffffff',
    },
  },
  ocean_blue: {
    id: 'ocean_blue',
    name: 'Ocean Blue',
    colors: {
      primaryColor: '#0284c7',
      secondaryColor: '#06b6d4',
      pageBg: '#f0f9ff',
      sidebarBg: '#0c4a6e',
      sidebarText: '#7dd3fc',
      surfaceBg: '#ffffff',
    },
  },
  emerald_business: {
    id: 'emerald_business',
    name: 'Emerald Business',
    colors: {
      primaryColor: '#059669',
      secondaryColor: '#34d399',
      pageBg: '#ecfdf5',
      sidebarBg: '#064e3b',
      sidebarText: '#a7f3d0',
      surfaceBg: '#ffffff',
    },
  },
  dark_night: {
    id: 'dark_night',
    name: 'Noche Oscura (Dark Mode)',
    colors: {
      primaryColor: '#8b5cf6',
      secondaryColor: '#ec4899',
      pageBg: '#0f172a',
      sidebarBg: '#020617',
      sidebarText: '#cbd5e1',
      surfaceBg: '#1e293b',
    },
  },
};

export const isDarkColor = (colorHex: string): boolean => {
  if (!colorHex || typeof colorHex !== 'string') return false;
  const hex = colorHex.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

export const applyCustomTheme = (theme: ThemeColors) => {
  const root = document.documentElement;

  root.style.setProperty('--primary-600', theme.primaryColor);
  root.style.setProperty('--primary-500', theme.primaryColor);
  root.style.setProperty('--primary-700', theme.primaryColor);
  root.style.setProperty('--primary-800', theme.primaryColor);
  root.style.setProperty('--primary-900', theme.primaryColor);
  root.style.setProperty('--primary-100', `${theme.primaryColor}22`);
  root.style.setProperty('--primary-50', `${theme.primaryColor}11`);

  root.style.setProperty('--accent-500', theme.secondaryColor);
  root.style.setProperty('--accent-600', theme.secondaryColor);
  root.style.setProperty('--accent-700', theme.secondaryColor);
  root.style.setProperty('--secondary-color', theme.secondaryColor);

  root.style.setProperty('--bg-app', theme.pageBg);
  root.style.setProperty('--bg-sidebar', theme.sidebarBg);
  root.style.setProperty('--text-sidebar', theme.sidebarText);
  root.style.setProperty('--bg-surface', theme.surfaceBg);

  root.setAttribute('data-theme', 'light');
  root.style.setProperty('--text-primary', '#0f172a');
  root.style.setProperty('--text-secondary', '#64748b');
  root.style.setProperty('--text-muted', '#94a3b8');
  root.style.setProperty('--text-inverse', '#ffffff');
  root.style.setProperty('--border-color', '#e2e8f0');
  root.style.setProperty('--border-subtle', '#f1f5f9');

  localStorage.setItem('custom_tenant_theme', JSON.stringify(theme));
  localStorage.setItem('theme', 'light');
};

export const applyTenantTheme = (presetOrTheme: string | ThemeColors) => {
  if (typeof presetOrTheme === 'string') {
    const preset = PRESETS[presetOrTheme] || PRESETS['default'];
    applyCustomTheme(preset.colors);
    localStorage.setItem('color_preset', presetOrTheme);
  } else {
    applyCustomTheme(presetOrTheme);
  }
};

export const loadSavedTheme = () => {
  const savedCustom = localStorage.getItem('custom_tenant_theme');
  if (savedCustom) {
    try {
      const themeObj = JSON.parse(savedCustom);
      applyCustomTheme(themeObj);
      return;
    } catch (e) {
      console.error(e);
    }
  }

  const savedPreset = localStorage.getItem('color_preset');
  if (savedPreset && PRESETS[savedPreset]) {
    applyCustomTheme(PRESETS[savedPreset].colors);
  }
};

export const getPresets = () => {
  return Object.values(PRESETS);
};