import React, { useState } from 'react';
import { User, Lock, Mail, Shield, Check, Save } from 'lucide-react';
import { PageHeader, Button, Card, CardHeader, CardBody } from '../components/ui';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: 'Carlos Mendoza Ramos',
    email: 'carlos.mendoza@ventasbv.pe',
    role: 'Administrador de Sistema',
    username: 'cmendoza',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Mi Perfil"
        subtitle="Información de tu cuenta, seguridad y contraseña"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="text-center p-6">
          <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 text-3xl font-bold flex items-center justify-center mx-auto mb-4 border-4 border-primary-50">
            {profile.fullName.charAt(0)}
          </div>
          <h3 className="font-bold text-xl text-primary-900">{profile.fullName}</h3>
          <p className="text-xs text-secondary mb-3">@{profile.username}</p>
          <span className="badge badge-primary inline-flex items-center gap-1">
            <Shield size={12} /> {profile.role}
          </span>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Editar Información Personal" />
          <CardBody>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nombre Completo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Nombre de Usuario</label>
                  <input type="text" className="form-control" value={profile.username} disabled />
                </div>
              </div>
              <div>
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="form-control"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>

              <hr className="my-6 border-neutral-200" />

              <h4 className="font-semibold text-sm text-primary-900 mb-3 flex items-center gap-2">
                <Lock size={16} /> Cambiar Contraseña
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nueva Contraseña</label>
                  <input type="password" className="form-control" placeholder="••••••••" />
                </div>
                <div>
                  <label className="form-label">Confirmar Contraseña</label>
                  <input type="password" className="form-control" placeholder="••••••••" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit">
                  {saved ? <Check size={18} className="mr-1.5 inline" /> : <Save size={18} className="mr-1.5 inline" />}
                  {saved ? '¡Actualizado!' : 'Guardar Perfil'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
