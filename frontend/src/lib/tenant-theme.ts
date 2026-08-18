const presets: Record<string, Record<string, string>> = {
  indigo_gold: {
    '--primary-50': '#eef2ff',
    '--primary-100': '#e0e7ff',
    '--primary-200': '#c7d2fe',
    '--primary-300': '#a5b4fc',
    '--primary-400': '#818cf8',
    '--primary-500': '#6366f1',
    '--primary-600': '#4f46e5',
    '--primary-700': '#4338ca',
    '--primary-800': '#3730a3',
    '--primary-900': '#312e81',
    '--primary-950': '#1e1b4b',
    '--accent-500': '#f59e0b',
    '--accent-600': '#d97706',
    '--accent-700': '#b45309',
  },
  ocean_blue: {
    '--primary-50': '#f0f9ff',
    '--primary-100': '#e0f2fe',
    '--primary-200': '#bae6fd',
    '--primary-300': '#7dd3fc',
    '--primary-400': '#38bdf8',
    '--primary-500': '#0ea5e9',
    '--primary-600': '#0284c7',
    '--primary-700': '#0369a1',
    '--primary-800': '#075985',
    '--primary-900': '#0c4a6e',
    '--primary-950': '#082f49',
    '--accent-500': '#06b6d4',
    '--accent-600': '#0891b2',
    '--accent-700': '#0e7490',
  },
  emerald_business: {
    '--primary-50': '#ecfdf5',
    '--primary-100': '#d1fae5',
    '--primary-200': '#a7f3d0',
    '--primary-300': '#6ee7b7',
    '--primary-400': '#34d399',
    '--primary-500': '#10b981',
    '--primary-600': '#059669',
    '--primary-700': '#047857',
    '--primary-800': '#065f46',
    '--primary-900': '#064e3b',
    '--primary-950': '#022c22',
    '--accent-500': '#34d399',
    '--accent-600': '#10b981',
    '--accent-700': '#059669',
  },
  default: {
    '--primary-50': '#eff6ff',
    '--primary-100': '#dbeafe',
    '--primary-200': '#bfdbfe',
    '--primary-300': '#93c5fd',
    '--primary-400': '#60a5fa',
    '--primary-500': '#3b82f6',
    '--primary-600': '#2563eb',
    '--primary-700': '#1d4ed8',
    '--primary-800': '#1e40af',
    '--primary-900': '#1e3a8a',
    '--primary-950': '#0f172a',
    '--accent-500': '#10b981',
    '--accent-600': '#059669',
    '--accent-700': '#047857',
  },
};

export const applyTenantTheme = (presetName: string) => {
  const vars = presets[presetName] || presets['default'];
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem('color_preset', presetName);
};

export const loadSavedTheme = () => {
  const saved = localStorage.getItem('color_preset');
  if (saved && presets[saved]) {
    applyTenantTheme(saved);
  }
};

export const getPresets = () => {
  return [
    { id: 'default', name: 'Azul Clásico', colors: ['#2563eb', '#10b981'] },
    { id: 'indigo_gold', name: 'Indigo / Gold', colors: ['#4f46e5', '#f59e0b'] },
    { id: 'ocean_blue', name: 'Ocean Blue', colors: ['#0284c7', '#06b6d4'] },
    { id: 'emerald_business', name: 'Emerald Business', colors: ['#059669', '#34d399'] },
  ];
};