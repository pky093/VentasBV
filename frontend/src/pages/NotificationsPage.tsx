import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, Trash2, Check } from 'lucide-react';
import { PageHeader, Button, Badge, Card } from '../components/ui';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  read: boolean;
  time: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'Stock Bajo Alerta', message: 'Laptop HP Pavilion tiene solo 2 unidades en almacén Principal.', type: 'DANGER', read: false, time: 'Hace 10 min' },
    { id: '2', title: 'Orden de Compra Recibida', message: 'La orden OC-001 de Distribuidora Tech ha ingresado al kardex.', type: 'SUCCESS', read: false, time: 'Hace 2 horas' },
    { id: '3', title: 'Apertura de Caja', message: 'Caja Principal abierta por Carlos Mendoza con S/ 200.00.', type: 'INFO', read: true, time: 'Hace 5 horas' },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div>
      <PageHeader
        title="Centro de Notificaciones"
        subtitle="Alertas de stock, eventos de sistema y avisos operativos"
        action={
          <Button variant="secondary" onClick={markAllRead}>
            <Check size={16} className="mr-1.5 inline" /> Marcar todas como leídas
          </Button>
        }
      />

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className={`p-4 transition-all ${!n.read ? 'bg-primary-50/30 border-primary-200' : ''}`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${n.type === 'DANGER' ? 'bg-danger-100 text-danger-600' : n.type === 'SUCCESS' ? 'bg-success-100 text-success-600' : 'bg-info-100 text-info-600'}`}>
                {n.type === 'DANGER' ? <AlertTriangle size={20} /> : n.type === 'SUCCESS' ? <CheckCircle size={20} /> : <Info size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-primary-900 text-sm">{n.title}</h4>
                  <span className="text-xs text-secondary">{n.time}</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">{n.message}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
