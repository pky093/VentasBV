import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, Package, AlertTriangle, ArrowUpRight, Eye, EyeOff } from 'lucide-react';
import { PageHeader, Button, StatCard, Badge } from '../components/ui';
import { productsService, salesService, Product, Sale } from '../lib/db-services';
import { SalesChart } from '../components/dashboard/SalesChart';

export default function DashboardPage() {
  const [showBalances, setShowBalances] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsService.getProducts(),
      salesService.getSales(),
    ]).then(([prodData, saleData]) => {
      setProducts(prodData);
      setSales(saleData);
      setIsLoading(false);
    });
  }, []);

  const formatMoney = (amount: string) => (showBalances ? amount : 'S/ ••••••');

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const getTodaySalesSum = () => {
    const today = new Date();
    const todaySales = sales.filter((s) => {
      const saleDate = new Date(s.rawDate);
      return (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear() &&
        (s.status === 'COMPLETED' || s.status === 'PAID')
      );
    });
    return todaySales.reduce((sum, s) => sum + s.total, 0);
  };

  const todaySalesSum = getTodaySalesSum();
  const operationsCount = sales.length;

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
          value={isLoading ? '...' : formatMoney(`S/ ${todaySalesSum.toFixed(2)}`)}
          icon={<DollarSign size={24} />}
          variant="primary"
          trend="Supabase Activo"
        />
        <StatCard
          title="Operaciones"
          value={isLoading ? '...' : String(operationsCount)}
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

      {/* Row 2: Sales Chart & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <SalesChart sales={sales} showBalances={showBalances} />
        </div>

        {/* Inventory Critical Alerts */}
        <div className="card flex flex-col">
          <div className="card-header pb-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle size={18} className="text-danger-500" /> Alertas de Inventario
            </h3>
          </div>
          <div className="card-body">
            <div className="inventory-alert-list overflow-y-auto max-h-[250px]">
              {isLoading ? (
                <div className="text-center py-6 text-xs text-secondary">Cargando alertas...</div>
              ) : products.filter((p) => p.stock <= p.minStock).length === 0 ? (
                <div className="text-center py-6 text-secondary text-xs">Sin alertas críticas de stock</div>
              ) : (
                products
                  .filter((p) => p.stock <= p.minStock)
                  .slice(0, 4)
                  .map((p) => (
                    <div key={p.id} className={`inventory-alert-item ${p.stock === 0 ? 'critical' : 'warning'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${p.stock === 0 ? 'bg-danger-100 text-danger-600 dark:bg-danger-950/50 dark:text-danger-400' : 'bg-warning-100 text-warning-600 dark:bg-warning-950/50 dark:text-warning-400'}`}>
                            <AlertTriangle size={13} className={p.stock === 0 ? 'animate-pulse' : ''} />
                          </div>
                          <div>
                            <div className="font-bold text-primary text-xs leading-tight">{p.name}</div>
                            <div className="text-[10px] text-secondary font-mono mt-0.5">{p.code}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${p.stock === 0 ? 'bg-danger-100 text-danger-700 dark:bg-danger-950 dark:text-danger-300' : 'bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300'}`}>
                            Stock: {p.stock}
                          </span>
                          <div className="text-[9px] text-secondary mt-0.5">Mín: {p.minStock}</div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="flex items-center gap-2.5 mt-1">
                        <div className="inventory-alert-progress-bg">
                          <div 
                            className={`inventory-alert-progress-fill transition-all duration-300 ${p.stock === 0 ? 'critical' : 'warning'}`} 
                            style={{ width: `${Math.max(6, Math.min(100, (p.stock / p.minStock) * 100))}%` }}
                          />
                        </div>
                        <Link 
                          to="/app/inventory" 
                          className="text-[10px] font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors whitespace-nowrap"
                        >
                          Reabastecer
                        </Link>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Últimas Ventas Emitidas (Now takes full width for a cleaner view) */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card">
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
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-secondary">Cargando ventas...</td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-secondary">Sin ventas registradas</td>
                  </tr>
                ) : (
                  sales.slice(0, 4).map((sale) => {
                    const initials = sale.customer
                      ? sale.customer.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'CG';
                    return (
                      <tr key={sale.id}>
                        <td className="font-semibold text-primary">
                          <Link 
                            to={`/app/sales?search=${sale.saleNumber}`} 
                            className="hover:underline text-primary-600 hover:text-primary-700"
                            title="Ir a detalles de venta"
                          >
                            {sale.saleNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-700 text-xs font-bold">
                              {initials}
                            </div>
                            <span className="font-medium">{sale.customer}</span>
                          </div>
                        </td>
                        <td className="font-bold text-primary">{formatMoney(`S/ ${sale.total.toFixed(2)}`)}</td>
                        <td className="text-xs text-secondary">{sale.paymentMethod}</td>
                        <td>
                          <Badge variant={sale.status === 'COMPLETED' || sale.status === 'PAID' ? 'success' : 'danger'}>
                            {sale.status === 'COMPLETED' || sale.status === 'PAID' ? 'Pagado' : 'Anulado'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}