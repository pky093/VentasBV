const fs = require('fs');
const path = require('path');

const root = path.resolve('C:/Users/pboca/.gemini/antigravity/scratch/VentasBV/frontend');

const files = {
  "package.json": `{
  "name": "@ventasbv/frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --pretty false"
  },
  "dependencies": {
    "@fontsource-variable/chivo": "5.2.8",
    "@fontsource/ibm-plex-sans": "5.2.8",
    "@fontsource/ibm-plex-mono": "5.2.7",
    "@tanstack/react-query": "5.101.2",
    "lucide-react": "0.471.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-hook-form": "7.54.2",
    "@hookform/resolvers": "3.10.0",
    "react-router-dom": "7.1.1",
    "socket.io-client": "4.8.1",
    "zod": "3.24.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "22.10.5",
    "@types/react": "19.0.4",
    "@types/react-dom": "19.0.2",
    "@vitejs/plugin-react": "4.3.4",
    "typescript": "5.7.3",
    "vite": "6.0.7"
  }
}`,

  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@ventasbv/contracts": ["./src/contracts/index.ts"],
      "@ventasbv/ui": ["./src/components/ui/index.tsx"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,

  "tsconfig.node.json": `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`,

  "vite.config.ts": `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ventasbv/contracts': path.resolve(__dirname, './src/contracts/index.ts'),
      '@ventasbv/ui': path.resolve(__dirname, './src/components/ui/index.tsx')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});`,

  "index.html": `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ventas B&V — Sistema de Gestión de Ventas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  "src/styles.css": \`:root {
  /* Brand Colors - Premium Indigo/Navy */
  --primary-50: #eef2f6;
  --primary-100: #d9e2ec;
  --primary-200: #b6cadd;
  --primary-300: #8baecd;
  --primary-400: #5c8db9;
  --primary-500: #3a71a3;
  --primary-600: #295782;
  --primary-700: #1e3a5f;
  --primary-800: #162a45;
  --primary-900: #101c2e;

  /* Accent Colors - Gold/Amber */
  --accent-50: #fdf8eb;
  --accent-100: #fcedcb;
  --accent-200: #fade9b;
  --accent-300: #f6c863;
  --accent-400: #f2af32;
  --accent-500: #d4a84b;
  --accent-600: #b38525;
  --accent-700: #8c621d;
  --accent-800: #6e4c1b;
  --accent-900: #5c3e19;

  /* Neutral Colors */
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-300: #cbd5e1;
  --neutral-400: #94a3b8;
  --neutral-500: #64748b;
  --neutral-600: #475569;
  --neutral-700: #334155;
  --neutral-800: #1e293b;
  --neutral-900: #0f172a;
  
  /* Semantic */
  --success-500: #10b981;
  --success-100: #d1fae5;
  --danger-500: #ef4444;
  --danger-100: #fee2e2;
  --warning-500: #f59e0b;
  --warning-100: #fef3c7;
  --info-500: #3b82f6;
  --info-100: #dbeafe;

  --bg-app: var(--neutral-50);
  --bg-surface: #ffffff;
  --bg-surface-hover: var(--neutral-50);
  --text-primary: var(--neutral-900);
  --text-secondary: var(--neutral-500);
  --text-inverse: #ffffff;
  --border-color: var(--neutral-200);
  --border-focus: var(--primary-500);
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-modal: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --font-display: 'Chivo Variable', system-ui, sans-serif;
  
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

[data-theme='dark'] {
  --bg-app: var(--neutral-900);
  --bg-surface: var(--neutral-800);
  --bg-surface-hover: var(--neutral-700);
  --text-primary: var(--neutral-50);
  --text-secondary: var(--neutral-400);
  --border-color: var(--neutral-700);
}

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background-color: var(--bg-app);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); font-weight: 600; }
button, input, select, textarea { font-family: inherit; color: inherit; }
a { color: var(--primary-500); text-decoration: none; transition: color var(--transition-fast); }
a:hover { color: var(--primary-600); }

/* Typography */
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }

.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.text-secondary { color: var(--text-secondary); }
.text-center { text-align: center; }

/* Flex & Grid */
.flex { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.flex-1 { flex: 1; }

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

/* Spacing */
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.mt-4 { margin-top: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.w-full { width: 100%; }
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }

/* UI Components */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 500;
  font-size: 0.875rem; border: 1px solid transparent; cursor: pointer;
  transition: all var(--transition-fast); white-space: nowrap;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background-color: var(--primary-700); color: var(--text-inverse); }
.btn-primary:hover:not(:disabled) { background-color: var(--primary-800); }
.btn-secondary { background-color: var(--neutral-100); color: var(--text-primary); border-color: var(--neutral-200); }
.btn-secondary:hover:not(:disabled) { background-color: var(--neutral-200); }
.btn-danger { background-color: var(--danger-500); color: var(--text-inverse); }
.btn-ghost { background-color: transparent; color: var(--text-secondary); }
.btn-ghost:hover:not(:disabled) { background-color: var(--neutral-100); color: var(--text-primary); }

.card {
  background-color: var(--bg-surface); border-radius: var(--radius-lg);
  border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); overflow: hidden;
}
.card-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.card-body { padding: 1.5rem; }

.badge {
  display: inline-flex; align-items: center; padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
}
.badge-success { background-color: var(--success-100); color: #065f46; }
.badge-warning { background-color: var(--warning-100); color: #92400e; }
.badge-danger { background-color: var(--danger-100); color: #991b1b; }
.badge-primary { background-color: var(--primary-100); color: var(--primary-700); }
.badge-neutral { background-color: var(--neutral-100); color: var(--neutral-700); }

.table { width: 100%; border-collapse: collapse; text-align: left; }
.table th { padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border-color); background-color: var(--neutral-50); }
.table td { padding: 1rem; font-size: 0.875rem; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }

.form-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
.form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
.form-control {
  padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);
  background-color: var(--bg-surface); color: var(--text-primary); font-size: 0.875rem; width: 100%;
}
.form-control:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 2px rgba(58, 113, 163, 0.2); }
.form-error { font-size: 0.75rem; color: var(--danger-500); }

.app-layout { display: flex; height: 100vh; overflow: hidden; background-color: var(--bg-app); }
.app-sidebar { width: 250px; background-color: var(--primary-700); color: var(--text-inverse); display: flex; flex-direction: column; }
.app-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.app-header { height: 64px; background-color: var(--bg-surface); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; }
.app-content { flex: 1; overflow-y: auto; padding: 1.5rem; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; }
.page-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }

.stat-card {
  background-color: var(--bg-surface); padding: 1.25rem; border-radius: var(--radius-lg);
  border: 1px solid var(--border-color); display: flex; align-items: flex-start; gap: 1rem; box-shadow: var(--shadow-sm);
}

.modal-overlay { position: fixed; inset: 0; background-color: rgba(15, 23, 42, 0.5); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
.modal-content { background-color: var(--bg-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-modal); width: 100%; max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-body { padding: 1.5rem; overflow-y: auto; }
.modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem; background-color: var(--neutral-50); }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1.5rem; text-align: center; border: 1px dashed var(--border-color); border-radius: var(--radius-lg); }

.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
\`,

  "src/main.tsx": \`import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);\`,

  "src/App.tsx": \`import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// We will add proper components later, providing a basic skeleton to ensure Vite runs.
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p>This page is under construction.</p>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Placeholder title="Login" />} />
      <Route path="/app/*" element={
        <div className="app-layout">
          <div className="app-sidebar">
            <div className="p-4 font-bold text-xl">Ventas B&V</div>
            {/* Sidebar nav placeholder */}
          </div>
          <div className="app-main">
            <div className="app-header">Header</div>
            <div className="app-content">
              <Routes>
                <Route path="/" element={<Placeholder title="Dashboard" />} />
                <Route path="/branches" element={<Placeholder title="Branches" />} />
                <Route path="/users" element={<Placeholder title="Users" />} />
                <Route path="/products" element={<Placeholder title="Products" />} />
                <Route path="/pos" element={<Placeholder title="POS" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      } />
    </Routes>
  );
}\`
};

for (const [file, content] of Object.entries(files)) {
  const filePath = path.join(root, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
console.log("Base files created successfully.");
