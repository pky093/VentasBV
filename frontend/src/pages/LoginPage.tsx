import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Shield,
  User,
  Building2,
  Eye,
  EyeOff,
  HelpCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Field } from '../components/ui';
import Swal from 'sweetalert2';

import { usersService, auditService } from '../lib/db-services';
import { usePermissions } from '../context/PermissionContext';

interface StaffCredentials {
  taxId: string;
  username: string;
  password: string;
}

interface PlatformCredentials {
  email: string;
  password: string;
}

type LoginMode = 'personal' | 'superadmin';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUserRole } = usePermissions();

  const savedRuc = typeof window !== 'undefined' ? localStorage.getItem('tenant_ruc') || '20613639030' : '20613639030';

  const staffForm = useForm<StaffCredentials>({
    defaultValues: {
      taxId: savedRuc,
      username: '',
      password: '',
    },
  });

  const platformForm = useForm<PlatformCredentials>({
    defaultValues: {
      email: 'admin@ventasbv.pe',
      password: '',
    },
  });

  const changeMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setError(null);
    setShowPassword(false);
  };

  const submitPersonal = async (values: StaffCredentials) => {
    setError(null);
    try {
      const res = await usersService.authenticatePersonal(
        values.username,
        values.password,
        values.taxId
      );

      if (!res.success || !res.user || !res.tenant) {
        setError(res.error || 'Credenciales inválidas.');
        return;
      }

      const { user, tenant } = res;

      localStorage.setItem('is_logged_in', 'true');
      localStorage.setItem('auth_user', user.name || user.username);
      localStorage.setItem('auth_username', user.username);
      localStorage.setItem('auth_email', user.email);
      localStorage.setItem('auth_user_id', user.id);
      localStorage.setItem('auth_role', user.role);
      localStorage.setItem('user_role', user.role);
      localStorage.setItem('tenant_id', tenant.id);
      localStorage.setItem('tenant_ruc', tenant.ruc);
      localStorage.setItem('auth_ruc', tenant.ruc);
      localStorage.setItem('tenant_name', tenant.name);
      localStorage.setItem('active_branch_id', user.branchId);
      localStorage.setItem('active_branch_name', user.branchName);
      localStorage.setItem('assigned_branches', JSON.stringify(user.branches || [user.branchName]));
      localStorage.setItem('assigned_branch_ids', JSON.stringify((user as any).branchIds || [user.branchId]));
      
      setUserRole(user.role);

      // Record Audit Log for User Login
      auditService.logAction({
        action: 'INICIO DE SESIÓN',
        entityType: 'login',
        branchId: user.branchId,
        actorUserId: user.userId || user.id,
        actorUserName: user.name || user.username,
        actorUsername: user.username,
        actorRole: user.role,
        branchName: user.branchName,
        description: `Inicio de sesión exitoso de ${user.name || user.username} (${user.role}) en la sede ${user.branchName}`,
        details: {
          user_name: `${user.name || user.username} (${user.role})`,
          username: user.username,
          branch_name: user.branchName,
        },
      });

      navigate('/app');
    } catch (loginError) {
      const errMsg = loginError instanceof Error ? loginError.message : 'El RUC, usuario o contraseña no coinciden.';
      setError(errMsg);

      auditService.logAction({
        action: 'ACCESO FALLIDO',
        entityType: 'auth',
        actorUserName: values.username || 'Desconocido',
        actorUsername: values.username || 'usuario',
        description: `Intento fallido de inicio de sesión con usuario "${values.username}" (RUC: ${values.taxId || 'N/A'})`,
        details: { username: values.username, ruc: values.taxId, error: errMsg },
      });
    }
  };

  const submitSuperadmin = async (values: PlatformCredentials) => {
    setError(null);
    try {
      localStorage.setItem('is_logged_in', 'true');
      localStorage.setItem('auth_user', values.email);
      localStorage.setItem('auth_username', values.email.split('@')[0]);
      localStorage.setItem('auth_role', 'Super Admin');
      localStorage.setItem('user_role', 'Super Admin');
      localStorage.setItem('is_platform_superadmin', 'true');
      
      setUserRole('Super Admin');

      // Record Audit Log for Superadmin Login
      auditService.logAction({
        action: 'INICIO DE SESIÓN',
        entityType: 'login',
        actorUserName: values.email,
        actorUsername: values.email.split('@')[0],
        actorRole: 'Super Admin',
        description: `Inicio de sesión de Administrador de Plataforma (${values.email})`,
        details: {
          user_name: `${values.email} (Super Admin)`,
          username: values.email.split('@')[0],
        },
      });

      navigate('/platform');
    } catch (loginError) {
      const errMsg = loginError instanceof Error ? loginError.message : 'El correo o la contraseña no coinciden.';
      setError(errMsg);

      auditService.logAction({
        action: 'ACCESO FALLIDO',
        entityType: 'auth',
        actorUserName: values.email || 'Super Admin',
        actorUsername: (values.email && values.email.split('@')[0]) || 'admin',
        description: `Intento fallido de acceso Superadmin con correo "${values.email}"`,
        details: { email: values.email, error: errMsg },
      });
    }
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

  const isSubmitting =
    mode === 'personal'
      ? staffForm.formState.isSubmitting
      : platformForm.formState.isSubmitting;

  return (
    <main className="login-shell">
      {/* LEFT COLUMN: BRAND STORY & HERO */}
      <section className="login-story">
        {/* Top Brand Header */}
        <div className="login-story__brand">
          <div className="login-story__brand-icon">
            <ShoppingCart size={22} />
          </div>
          <div className="login-story__brand-text">
            <span className="login-story__brand-title">B&V Ventas</span>
            <span className="login-story__brand-subtitle">Plataforma POS Empresarial</span>
          </div>
        </div>

        {/* Center Hero Logo */}
        <div className="login-story__hero">
          <img
            src="/bv-hero-logo.png"
            alt="B&V Ventas Logo"
            className="login-story__hero-img"
          />
        </div>

        {/* Bottom Brand Footer */}
        <div className="login-story__footer">
          <div className="login-story__footer-left">
            <Shield size={15} color="#f59e0b" />
            <span>VENTAS B&V</span>
          </div>
          <span className="login-story__footer-right">Soluciones • Tecnologías • Sistemas</span>
        </div>
      </section>

      {/* RIGHT COLUMN: AUTH PANEL & CARD */}
      <section className="login-panel">
        <div className="auth-card">
          {/* Role / Access Mode Switch */}
          <div className="access-switch" role="tablist" aria-label="Tipo de acceso">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'personal'}
              className={`access-switch__btn ${mode === 'personal' ? 'active' : ''}`}
              onClick={() => changeMode('personal')}
            >
              <User size={16} />
              <span>Personal</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'superadmin'}
              className={`access-switch__btn ${mode === 'superadmin' ? 'active' : ''}`}
              onClick={() => changeMode('superadmin')}
            >
              <Building2 size={16} />
              <span>Superadmin</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">
              {mode === 'personal' ? 'ACCESO DEL EQUIPO' : 'CONTROL DE PLATAFORMA'}
            </p>
            <h1 className="auth-card__title">
              {mode === 'personal' ? 'El servicio empieza aquí' : 'Administrar empresas'}
            </h1>
            <p className="auth-card__desc">
              {mode === 'personal'
                ? 'Ingresa con las credenciales asignadas por tu empresa.'
                : 'Acceso exclusivo para administrar empresas y sucursales.'}
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="auth-message-box auth-message-box--error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {/* PERSONAL / STAFF FORM */}
          {mode === 'personal' ? (
            <form
              className="auth-form"
              onSubmit={staffForm.handleSubmit(submitPersonal)}
              noValidate
            >
              <Field label="RUC" error={staffForm.formState.errors.taxId?.message}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  autoComplete="organization"
                  placeholder="Ingrese el RUC de la empresa"
                  className={`auth-input ${
                    staffForm.formState.errors.taxId ? 'auth-input--error' : ''
                  }`}
                  {...staffForm.register('taxId', {
                    required: 'Ingrese el RUC de la empresa.',
                    pattern: {
                      value: /^\d{11}$/,
                      message: 'El RUC debe tener exactamente 11 dígitos numéricos.',
                    },
                  })}
                />
              </Field>

              <Field label="USUARIO" error={staffForm.formState.errors.username?.message}>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Ingrese su usuario"
                  className={`auth-input ${
                    staffForm.formState.errors.username ? 'auth-input--error' : ''
                  }`}
                  {...staffForm.register('username', {
                    required: 'Ingrese su usuario.',
                    minLength: {
                      value: 3,
                      message: 'El usuario debe tener al menos 3 caracteres.',
                    },
                  })}
                />
              </Field>

              <Field label="CONTRASEÑA" error={staffForm.formState.errors.password?.message}>
                <div className="password-control">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className={`auth-input ${
                      staffForm.formState.errors.password ? 'auth-input--error' : ''
                    }`}
                    {...staffForm.register('password', {
                      required: 'Ingrese su contraseña.',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-auth-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>VALIDANDO CREDENCIALES...</span>
                  </>
                ) : (
                  <>
                    <span>ENTRAR AL SISTEMA</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* SUPERADMIN / PLATFORM FORM */
            <form
              className="auth-form"
              onSubmit={platformForm.handleSubmit(submitSuperadmin)}
              noValidate
            >
              <Field label="CORREO" error={platformForm.formState.errors.email?.message}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Ingrese su correo electrónico"
                  className={`auth-input ${
                    platformForm.formState.errors.email ? 'auth-input--error' : ''
                  }`}
                  {...platformForm.register('email', {
                    required: 'Ingrese su correo electrónico.',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Ingrese un formato de correo válido.',
                    },
                  })}
                />
              </Field>

              <Field label="CONTRASEÑA" error={platformForm.formState.errors.password?.message}>
                <div className="password-control">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className={`auth-input ${
                      platformForm.formState.errors.password ? 'auth-input--error' : ''
                    }`}
                    {...platformForm.register('password', {
                      required: 'Ingrese su contraseña.',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-auth-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>VALIDANDO CREDENCIALES...</span>
                  </>
                ) : (
                  <>
                    <span>ENTRAR COMO SUPERADMIN</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Assistance & Recovery */}
          <div className="auth-card__footer">
            <button
              type="button"
              onClick={handleSupportClick}
              className="auth-support-link"
            >
              <HelpCircle size={14} color="#f59e0b" />
              <span>¿Necesitas ayuda? Central: 01 234 5678</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}