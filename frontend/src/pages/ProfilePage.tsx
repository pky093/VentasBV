import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Shield, Check, Save, Loader2 } from 'lucide-react';
import { PageHeader, Button, Card, CardHeader, CardBody } from '../components/ui';
import { profileService } from '../lib/db-services';
import Swal from 'sweetalert2';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: '',
    username: '',
  });

  const [passwordFields, setPasswordFields] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const data = await profileService.getProfile();
        setProfile({
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          username: data.username,
        });
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile.fullName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor, ingresa tu nombre completo.',
      });
      return;
    }

    if (!profile.username.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Por favor, ingresa un nombre de usuario válido.',
      });
      return;
    }

    if (passwordFields.newPassword) {
      if (passwordFields.newPassword.length < 3) {
        Swal.fire({
          icon: 'warning',
          title: 'Contraseña muy corta',
          text: 'La nueva contraseña debe tener al menos 3 caracteres.',
        });
        return;
      }
      if (passwordFields.newPassword !== passwordFields.confirmPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Contraseñas no coinciden',
          text: 'La confirmación de contraseña no coincide con la nueva contraseña ingresada.',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await profileService.updateProfile({
        fullName: profile.fullName,
        username: profile.username,
        email: profile.email,
        password: passwordFields.newPassword || undefined,
      });

      if (!res.success) {
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar',
          text: res.error || 'No se pudo guardar la información de tu perfil.',
        });
        return;
      }

      setSaved(true);
      setPasswordFields({ newPassword: '', confirmPassword: '' });
      Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Tu información de perfil y nombre de usuario se han actualizado correctamente.',
        timer: 2000,
        showConfirmButton: false,
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un inconveniente al actualizar tu perfil.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Mi Perfil"
        subtitle="Información de tu cuenta, seguridad y contraseña"
      />

      {isLoading ? (
        <div className="p-12 text-center text-secondary">
          <Loader2 size={24} className="animate-spin inline-block mb-2 text-primary-500" />
          <div>Cargando información del perfil...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="text-center p-6">
            <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 text-3xl font-bold flex items-center justify-center mx-auto mb-4 border-4 border-primary-50">
              {profile.fullName.charAt(0).toUpperCase() || 'U'}
            </div>
            <h3 className="font-bold text-xl text-primary-900">{profile.fullName || 'Usuario'}</h3>
            <p className="text-xs text-secondary mb-3">@{profile.username || 'usuario'}</p>
            <span className="badge badge-primary inline-flex items-center gap-1">
              <Shield size={12} /> {profile.role || 'Usuario'}
            </span>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Editar Información Personal" />
            <CardBody>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label font-bold text-xs">Nombre Completo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label font-bold text-xs">Nombre de Usuario</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="Ej. miusuario"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label font-bold text-xs">Correo Electrónico</label>
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
                    <label className="form-label font-bold text-xs">Nueva Contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="•••••••• (Opcional)"
                      value={passwordFields.newPassword}
                      onChange={(e) =>
                        setPasswordFields({ ...passwordFields, newPassword: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label font-bold text-xs">Confirmar Contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="•••••••• (Opcional)"
                      value={passwordFields.confirmPassword}
                      onChange={(e) =>
                        setPasswordFields({ ...passwordFields, confirmPassword: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-1.5 inline" />
                        <span>Guardando...</span>
                      </>
                    ) : saved ? (
                      <>
                        <Check size={18} className="mr-1.5 inline" />
                        <span>¡Actualizado!</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-1.5 inline" />
                        <span>Guardar Perfil</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

