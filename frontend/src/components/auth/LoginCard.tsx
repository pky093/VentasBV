import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, Eye, EyeOff, HelpCircle, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';

export const LoginCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'superadmin'>('personal');
  const [ruc, setRuc] = useState('20601234567');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      Swal.fire({
        title: 'Campos Incompletos',
        text: 'Por favor ingresa tu usuario y contraseña.',
        icon: 'warning',
        confirmButtonColor: '#f59e0b',
        background: '#0d1322',
        color: '#ffffff',
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      localStorage.setItem('is_logged_in', 'true');
      localStorage.setItem('auth_user', username);
      localStorage.setItem('active_branch_id', 'MAIN');
      navigate('/app');
    }, 600);
  };

  const handleSupportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    Swal.fire({
      title: 'Central de Soporte Ventas B&V',
      text: 'Comunícate con nuestra central de soporte al 01 234 5678 o escribe a soporte@ventasbv.pe',
      icon: 'info',
      confirmButtonColor: '#f59e0b',
      background: '#0d1322',
      color: '#ffffff',
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ROLE / TAB TOGGLE PILL */}
      <div style={{ backgroundColor: '#060a12', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('personal');
            setUsername('');
            setPassword('');
          }}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s',
            background: activeTab === 'personal' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
            color: activeTab === 'personal' ? '#060a12' : '#94a3b8',
            boxShadow: activeTab === 'personal' ? '0 4px 12px rgba(245, 158, 11, 0.25)' : 'none',
          }}
        >
          <User size={16} />
          <span>Personal</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('superadmin');
            setUsername('admin@ventasbv.pe');
            setPassword('admin123');
          }}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s',
            background: activeTab === 'superadmin' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
            color: activeTab === 'superadmin' ? '#060a12' : '#94a3b8',
            boxShadow: activeTab === 'superadmin' ? '0 4px 12px rgba(245, 158, 11, 0.25)' : 'none',
          }}
        >
          <Building2 size={16} />
          <span>Superadmin</span>
        </button>
      </div>

      {/* HEADER CONTENT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {activeTab === 'personal' ? 'ACCESO DEL EQUIPO' : 'ACCESO ADMINISTRATIVO'}
        </span>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
          El servicio empieza aquí
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Ingresa con las credenciales asignadas por tu empresa.
        </p>
      </div>

      {/* LOGIN FORM */}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* RUC FIELD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            RUC
          </label>
          <input
            type="text"
            value={ruc}
            onChange={(e) => setRuc(e.target.value)}
            placeholder="Ingrese el RUC de la empresa"
            required
            style={{
              width: '100%',
              height: '42px',
              padding: '0 14px',
              borderRadius: '10px',
              backgroundColor: '#060a12',
              border: '1px solid #1e293b',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* USUARIO FIELD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            USUARIO
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ingrese su usuario"
            required
            style={{
              width: '100%',
              height: '42px',
              padding: '0 14px',
              borderRadius: '10px',
              backgroundColor: '#060a12',
              border: '1px solid #1e293b',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* CONTRASEÑA FIELD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            CONTRASEÑA
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{
                width: '100%',
                height: '42px',
                padding: '0 40px 0 14px',
                borderRadius: '10px',
                backgroundColor: '#060a12',
                border: '1px solid #1e293b',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            height: '46px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#060a12',
            fontWeight: '900',
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
            marginTop: '6px',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? (
            <span>VALIDANDO CREDENCIALES...</span>
          ) : (
            <>
              <span>ENTRAR AL SISTEMA</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* FOOTER HELP LINK */}
      <div style={{ textAlign: 'center', paddingTop: '4px' }}>
        <a
          href="#help"
          onClick={handleSupportClick}
          style={{ color: '#94a3b8', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
        >
          <HelpCircle size={14} color="#f59e0b" />
          <span>¿Necesitas ayuda? Central: 01 234 5678</span>
        </a>
      </div>
    </div>
  );
};

export default LoginCard;
