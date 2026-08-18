import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/app');
  };

  return (
    <div className="flex min-h-screen bg-bg-app">
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-accent-500 mb-4">Ventas B&V</h1>
          <p className="text-primary-100 text-lg">El sistema definitivo para la gestión de tus ventas e inventario.</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
            <h3 className="font-bold text-xl text-accent-400 mb-2">Punto de Venta</h3>
            <p className="text-sm text-primary-100">Facturación rápida, control de caja y múltiples métodos de pago en tiempo real.</p>
          </div>
          <div className="p-6 bg-white/10 rounded-xl backdrop-blur">
            <h3 className="font-bold text-xl text-accent-400 mb-2">Inventario</h3>
            <p className="text-sm text-primary-100">Kardex detallado, múltiples sucursales y alertas automáticas de stock bajo.</p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary-900 mb-2">Bienvenido</h2>
            <p className="text-secondary">Inicia sesión en tu cuenta para continuar</p>
          </div>
          
          <div className="flex p-1 bg-neutral-100 rounded-lg mb-8">
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md ${mode === 'admin' ? 'bg-white shadow text-primary-700' : 'text-secondary'}`}
              onClick={() => setMode('admin')}
            >
              Administrador
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md ${mode === 'staff' ? 'bg-white shadow text-primary-700' : 'text-secondary'}`}
              onClick={() => setMode('staff')}
            >
              Personal
            </button>
          </div>

          <form onSubmit={handleLogin}>
            {mode === 'staff' && (
              <div className="form-group">
                <label className="form-label">RUC de la Empresa</label>
                <input type="text" className="form-control" placeholder="20123456789" required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Usuario o Correo</label>
              <input type="text" className="form-control" placeholder="admin@ventas.com" required />
            </div>
            <div className="form-group">
              <div className="flex justify-between items-center">
                <label className="form-label">Contraseña</label>
                <a href="#" className="text-xs text-primary-500 hover:underline">¿Olvidaste tu contraseña?</a>
              </div>
              <input type="password" className="form-control" placeholder="••••••••" required />
            </div>
            
            <button type="submit" className="btn btn-primary w-full mt-6 py-2.5 text-base">
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}