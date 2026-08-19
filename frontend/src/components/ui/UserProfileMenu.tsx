import React from 'react';
import { User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfileMenuProps {
  authUser: string;
  tenantRuc: string;
  onClose: () => void;
  onLogout: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  authUser,
  tenantRuc,
  onClose,
  onLogout,
}) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 10px)',
        width: '260px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '18px',
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Header Info */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(180deg, var(--bg-surface-hover) 0%, var(--bg-surface) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '15px',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
            }}
          >
            {authUser.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: '800',
                fontSize: '13px',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {authUser}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span>Super Admin • En Línea</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: '600', marginTop: '4px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-app)', display: 'inline-block', width: 'fit-content' }}>
          RUC: {tenantRuc}
        </div>
      </div>

      {/* Menu Actions */}
      <div style={{ padding: '6px' }}>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/app/profile');
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <User size={16} style={{ color: 'var(--primary-600)' }} />
          <span style={{ flex: 1 }}>Mi Perfil</span>
          <ChevronRight size={14} style={{ opacity: 0.4 }} />
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/app/settings');
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Settings size={16} style={{ color: 'var(--primary-600)' }} />
          <span style={{ flex: 1 }}>Configuración</span>
          <ChevronRight size={14} style={{ opacity: 0.4 }} />
        </button>
      </div>

      {/* Logout Footer */}
      <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px' }}>
        <button
          type="button"
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
