/**
 * SyncStatusIndicator — Visual badge in the header bar showing sync state.
 * 
 * States:
 * 🟢 En Línea — last sync timestamp
 * 🟡 Sincronizando (X cambios)... — progress animation
 * 🟠 Sin Conexión — pending changes count
 */

import React, { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, Cloud, Download } from 'lucide-react';
import { useSync } from '../../context/SyncContext';

export default function SyncStatusIndicator() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncDate,
    syncProgress,
    triggerSync,
    downloadOfflineData,
  } = useSync();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca';
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // Determine badge style & icon
  let badgeBg = 'var(--accent-500, #10b981)';
  let badgeText = 'En Línea';
  let BadgeIcon = Wifi;

  if (isSyncing) {
    badgeBg = 'var(--warning-500, #f59e0b)';
    badgeText = pendingCount > 0 ? `Sincronizando ${pendingCount}...` : 'Sincronizando...';
    BadgeIcon = RefreshCw;
  } else if (!isOnline) {
    badgeBg = 'var(--warning-600, #d97706)';
    badgeText = pendingCount > 0 ? `Offline (${pendingCount})` : 'Sin Conexión';
    BadgeIcon = WifiOff;
  }

  return (
    <div className="relative" ref={ref}>
      {/* Compact badge */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white transition-all duration-200 hover:opacity-90 cursor-pointer select-none"
        style={{ background: badgeBg }}
        title={isOnline ? 'Conectado' : 'Sin conexión a internet'}
      >
        <BadgeIcon
          size={13}
          className={isSyncing ? 'animate-spin' : ''}
        />
        <span className="hidden sm:inline">{badgeText}</span>
        {/* Pending count dot (visible when offline with pending) */}
        {!isOnline && pendingCount > 0 && !isSyncing && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse"
          >
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-50 shadow-xl"
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ background: badgeBg }}
          >
            {isOnline ? (
              <Cloud size={18} className="text-white" />
            ) : (
              <CloudOff size={18} className="text-white" />
            )}
            <div className="flex-1">
              <div className="text-white font-bold text-xs">
                {isOnline ? 'Conectado' : 'Sin Conexión'}
              </div>
              <div className="text-white/80 text-[10px]">
                {isSyncing
                  ? `Progreso: ${syncProgress}%`
                  : `Última sync: ${formatDate(lastSyncDate)}`}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>Cambios pendientes</span>
              <span
                className="font-bold"
                style={{
                  color: pendingCount > 0
                    ? 'var(--warning-600, #d97706)'
                    : 'var(--accent-500, #10b981)',
                }}
              >
                {pendingCount}
              </span>
            </div>

            {isSyncing && (
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--bg-app, #f1f5f9)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${syncProgress}%`,
                    background: 'var(--accent-500, #10b981)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className="px-3 py-2 space-y-1"
            style={{ borderTop: '1px solid var(--border-color, #e2e8f0)' }}
          >
            <button
              onClick={() => {
                triggerSync();
                setDropdownOpen(false);
              }}
              disabled={isSyncing || !isOnline}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'var(--bg-app, #f1f5f9)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'transparent';
              }}
            >
              <RefreshCw size={14} />
              Sincronizar Ahora
            </button>

            <button
              onClick={() => {
                downloadOfflineData();
                setDropdownOpen(false);
              }}
              disabled={isSyncing || !isOnline}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'var(--bg-app, #f1f5f9)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'transparent';
              }}
            >
              <Download size={14} />
              Descargar Datos Offline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
