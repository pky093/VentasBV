import React, { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, CheckCircle2, Info, Trash2, Check, 
  ShieldAlert, RefreshCw, Plus, Filter, Clock, CheckCheck
} from 'lucide-react';
import { PageHeader, Button, Badge, Card, SuggestionChip, Tabs, Modal, DataTable } from '../components/ui';
import { notificationsService, AppNotification } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'WARNING' | 'INFO'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New notification form
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER'>('INFO');

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const list = await notificationsService.getNotifications();
      setNotifications(list);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => loadNotifications();
    window.addEventListener('notifications_updated', handleUpdate);
    return () => {
      window.removeEventListener('notifications_updated', handleUpdate);
    };
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const success = await notificationsService.markAsRead(id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const handleMarkAllRead = async () => {
    const success = await notificationsService.markAllAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      Swal.fire({
        icon: 'success',
        title: 'Notificaciones actualizadas',
        text: 'Todas las notificaciones han sido marcadas como leídas.',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirm = await Swal.fire({
      title: '¿Eliminar notificación?',
      text: 'Esta acción removerá el aviso permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });

    if (confirm.isConfirmed) {
      const success = await notificationsService.deleteNotification(id);
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor ingresa un título y mensaje para la notificación.',
      });
      return;
    }

    setIsSubmitting(true);
    const success = await notificationsService.createNotification({
      title: newTitle.trim(),
      message: newMessage.trim(),
      type: newType,
    });
    setIsSubmitting(false);

    if (success) {
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewMessage('');
      setNewType('INFO');
      loadNotifications();
      Swal.fire({
        icon: 'success',
        title: 'Notificación emitida',
        text: 'El aviso se ha registrado en la base de datos.',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return date.toLocaleDateString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return dateStr;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'UNREAD') return !n.read;
    if (activeTab === 'WARNING') return n.type === 'WARNING' || n.type === 'DANGER';
    if (activeTab === 'INFO') return n.type === 'INFO' || n.type === 'SUCCESS';
    return true;
  });

  const columns = [
    {
      key: 'type',
      header: 'Prioridad / Tipo',
      render: (n: AppNotification) => {
        const isDanger = n.type === 'DANGER';
        const isWarning = n.type === 'WARNING';
        const isSuccess = n.type === 'SUCCESS';

        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                  : isWarning
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  : isSuccess
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-400'
              }`}
            >
              {isDanger ? (
                <ShieldAlert size={15} />
              ) : isWarning ? (
                <AlertTriangle size={15} />
              ) : isSuccess ? (
                <CheckCircle2 size={15} />
              ) : (
                <Info size={15} />
              )}
            </div>
            <SuggestionChip
              label={
                isDanger
                  ? 'Crítico'
                  : isWarning
                  ? 'Alerta de Stock'
                  : isSuccess
                  ? 'Operación'
                  : 'Sistema'
              }
              size="xs"
            />
          </div>
        );
      },
    },
    {
      key: 'title',
      header: 'Título y Detalle',
      render: (n: AppNotification) => (
        <div className="max-w-lg py-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-bold text-sm ${!n.read ? 'text-primary' : 'text-secondary'}`}>
              {n.title}
            </span>
            {!n.read && (
              <Badge variant="primary" className="text-[10px] px-1.5 py-0.2">
                Nueva
              </Badge>
            )}
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            {n.message}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (n: AppNotification) => (
        n.read ? (
          <span className="text-xs text-muted flex items-center gap-1 font-medium">
            <CheckCheck size={14} className="text-emerald-500" />
            Leída
          </span>
        ) : (
          <Badge variant="primary" className="font-bold">
            No leída
          </Badge>
        )
      ),
    },
    {
      key: 'created_at',
      header: 'Fecha / Tiempo',
      render: (n: AppNotification) => (
        <div className="flex items-center gap-1.5 text-xs text-secondary font-mono">
          <Clock size={13} className="text-primary-500 shrink-0" />
          <span>{formatRelativeTime(n.created_at)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de Notificaciones"
        subtitle="Alertas de stock, avisos operativos y eventos en tiempo real"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={loadNotifications}
              title="Recargar notificaciones"
            >
              <RefreshCw size={15} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                onClick={handleMarkAllRead}
                title="Marcar todas como leídas"
              >
                <CheckCheck size={16} className="mr-1.5 text-primary-600" />
                Marcar todas leídas
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} className="mr-1.5" />
              Emitir Aviso
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          { id: 'ALL', label: `Todas (${notifications.length})` },
          { id: 'UNREAD', label: `No Leídas (${unreadCount})` },
          { id: 'WARNING', label: `Alertas de Stock & Críticas (${notifications.filter(n => n.type === 'WARNING' || n.type === 'DANGER').length})` },
          { id: 'INFO', label: `Operativas & Sistema (${notifications.filter(n => n.type === 'INFO' || n.type === 'SUCCESS').length})` },
        ]}
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredNotifications}
        loading={isLoading}
        searchPlaceholder="Buscar alertas por título, mensaje o tipo..."
        actions={(n) => (
          <div className="flex items-center gap-2 justify-end">
            {!n.read && (
              <button
                type="button"
                onClick={() => handleMarkAsRead(n.id)}
                className="icon-btn icon-btn-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 border-none"
                title="Marcar como leída"
              >
                <Check size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(n.id)}
              className="icon-btn icon-btn-sm btn-action-danger border-none"
              title="Eliminar notificación"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      />

      {/* Modal: Emitir Aviso Manual */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Emitir Aviso / Notificación"
        size="md"
      >
        <form onSubmit={handleCreateNotification} className="space-y-4">
          <div>
            <label className="form-label">Título de la Notificación</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Mantenimiento programado, Stock mínimo..."
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">Tipo de Notificación</label>
            <select
              className="form-control"
              value={newType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewType(e.target.value as any)}
            >
              <option value="INFO">Informativa (Azul / Primario)</option>
              <option value="SUCCESS">Operación Exitosa (Verde)</option>
              <option value="WARNING">Alerta / Advertencia (Ámbar)</option>
              <option value="DANGER">Crítico / Peligro (Rojo)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Mensaje o Detalle</label>
            <textarea
              className="form-control"
              placeholder="Escribe el contenido de la alerta para los usuarios..."
              value={newMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-color">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Emitiendo...' : 'Publicar Notificación'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
