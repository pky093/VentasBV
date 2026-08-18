import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, Package, AlertTriangle, ArrowUpRight, Eye, EyeOff } from 'lucide-react';
import { PageHeader, Button, StatCard, Badge } from '../components/ui';
import { productsService, Product } from '../lib/db-services';

export default function DashboardPage() {
  const [showBalances, setShowBalances] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    productsService.getProducts().then((data) => {
      setProducts(data);
      setIsLoading(false);
    });
  }, []);

  const formatMoney = (amount: string) => (showBalances ? amount : 'S/ ••••••');

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div>
      <PageHeader
        title="Dashboard General"
        subtitle="Resumen de actividad comercial conectado a la base de datos Supabase"
        action={
          <Button
            variant="secondary"
            icon={showBalances ? <EyeOff size={16} /> : <Eye size={16} />}
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? 'Ocultar Saldos' : 'Mostrar Saldos'}
          </Button>
        }
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Ventas Hoy"
          value={formatMoney('S/ 2,450.00')}
          icon={<DollarSign size={24} />}
          variant="primary"
          trend="Supabase Activo"
        />
        <StatCard
          title="Operaciones"
          value="34"
          icon={<ShoppingCart size={24} />}
          variant="success"
          trend="En Sede Principal"
        />
        <StatCard
          title="Productos Activos"
          value={isLoading ? '...' : String(totalProducts)}
          icon={<Package size={24} />}
          variant="warning"
          trend="Catálogo Base de Datos"
        />
        <StatCard
          title="Stock Bajo"
          value={isLoading ? '...' : String(lowStockCount)}
          icon={<AlertTriangle size={24} />}
          variant="danger"
          trend="Requiere reposición"
        />
      </div>

      {/* Main Grid: Sales Table & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <h3 className="font-bold text-base">Últimas Ventas Emitidas</h3>
              <p className="text-xs text-secondary">Transacciones procesadas en sistema</p>
            </div>
            <Link to="/app/sales" className="btn btn-ghost btn-sm">
              Ver Historial <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Método</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold text-primary">B001-0000124</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-700 text-xs font-bold">
                        JP
                      </div>
                      <span className="font-medium">Juan Pérez</span>
                    </div>
                  </td>
                  <td className="font-bold text-primary">{formatMoney('S/ 150.00')}</td>
                  <td className="text-xs text-secondary">Tarjeta Débito</td>
                  <td>
                    <Badge variant="success">Pagado</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold text-primary">F001-0000089</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent-100 dark:bg-accent-950 flex items-center justify-center text-accent-700 text-xs font-bold">
                        IT
                      </div>
                      <span className="font-medium">Importaciones Tech S.A.C.</span>
                    </div>
                  </td>
                  <td className="font-bold text-primary">{formatMoney('S/ 2,850.00')}</td>
                  <td className="text-xs text-secondary">Transferencia</td>
                  <td>
                    <Badge variant="success">Pagado</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Critical Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle size={18} className="text-danger-500" /> Alertas de Inventario
            </h3>
          </div>
          <div className="divide-y divide-color">
            {products
              .filter((p) => p.stock <= p.minStock)
              .slice(0, 4)
              .map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-primary">{p.name}</div>
                    <div className="text-secondary">{p.code}</div>
                  </div>
                  <Badge variant="danger">Stock: {p.stock}</Badge>
                </div>
              ))}
            {products.filter((p) => p.stock <= p.minStock).length === 0 && (
              <div className="p-6 text-center text-secondary text-xs">Sin alertas críticas de stock</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}