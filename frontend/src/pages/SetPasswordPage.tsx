import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key } from 'lucide-react';
import { Button } from '../components/ui';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password === confirmPassword) {
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mx-auto mb-3">
            <Key size={24} />
          </div>
          <h2 className="text-2xl font-bold text-primary-900">Establecer Contraseña</h2>
          <p className="text-xs text-secondary mt-1">Crea una nueva contraseña para acceder a tu cuenta de Ventas B&V</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Nueva Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Confirmar Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full py-2.5 mt-4">
            Guardar e Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
