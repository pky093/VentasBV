import React from 'react';
import { ShoppingCart, Shield } from 'lucide-react';
import { LoginCard } from '../components/auth/LoginCard';

export default function LoginPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#050811',
        overflow: 'hidden',
        fontFamily: "'IBM Plex Sans', sans-serif"
      }}
    >
      {/* LEFT COLUMN: DARK BRAND CONTAINER WITH LOGO IMAGE (50% WIDTH) */}
      <div
        style={{
          width: '50%',
          height: '100%',
          backgroundColor: '#04070e',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid rgba(245, 158, 11, 0.2)',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* TOP BRAND HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          >
            <ShoppingCart size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1.1 }}>
              B&V Ventas
            </span>
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>
              Plataforma POS Empresarial
            </span>
          </div>
        </div>

        {/* CENTER HERO IMAGE */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '2rem 0' }}>
          <img
            src="/bv-hero-logo.png"
            alt="B&V Ventas"
            style={{
              maxWidth: '440px',
              maxHeight: '60vh',
              width: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 20px 35px rgba(245, 158, 11, 0.12))'
            }}
          />
        </div>

        {/* BOTTOM BRAND FOOTER */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#64748b', fontWeight: '500', zIndex: 10, paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={14} color="#f59e0b" />
            <span style={{ color: '#e2e8f0', fontWeight: '700' }}>VENTAS B&V</span>
          </div>
          <span style={{ marginLeft: 'auto' }}>Soluciones • Tecnologías • Sistemas</span>
        </div>
      </div>

      {/* RIGHT COLUMN: DARK SLATE CONTAINER WITH LOGIN CARD (50% WIDTH) */}
      <div
        style={{
          width: '50%',
          height: '100%',
          backgroundColor: '#0d1322',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxSizing: 'border-box',
          position: 'relative',
          overflowY: 'auto'
        }}
      >
        <LoginCard />
      </div>
    </div>
  );
}