import { supabase, getActiveTenantId } from './supabase';
import { auditService } from './db-services';

export interface VehicleContract {
  id: string;
  tenantId?: string;
  contractNumber: string;
  docType: 'CONTRATO' | 'COTIZACION';
  vehicleType: 'MOTOCICLETA' | 'CUATRIMOTO' | 'ELECTRICA' | 'TRIMOTO_PASAJEROS' | 'TRIMOTO_CARGA';
  date: string;
  // Customer details
  customerName: string;
  customerDocType: 'DNI' | 'RUC';
  customerDoc: string;
  customerAddress: string;
  customerPhone: string;
  maritalStatus: 'SOLTERO' | 'CASADO' | 'OTRO';
  // Vehicle details
  brand: string;
  model: string;
  color: string;
  cylinderCapacity: string;
  dua: string;
  item: string;
  engineNumber: string;
  chassisNumber: string;
  // Payment details
  totalPrice: number;
  downPayment: number;
  balance: number;
  paymentMethodDetail: string;
  dueDate: string;
  balanceReason: string;
  // Legalization & Observations
  notaryLegalization: 'SI_20' | 'CLIENTE' | 'NO';
  observations: string;
  status: 'VIGENTE' | 'CANCELADO' | 'ANULADO';
  createdAt?: string;
}

const getStorageKey = () => `ventasbv_vehicle_contracts_${getActiveTenantId() || 'global'}`;

const getStoredContracts = (): VehicleContract[] => {
  const local = localStorage.getItem(getStorageKey());
  if (local) {
    try {
      return JSON.parse(local);
    } catch {
      // ignore
    }
  }
  return [];
};

export const contractsService = {
  async getContracts(): Promise<VehicleContract[]> {
    try {
      const tenantId = getActiveTenantId();
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          contractNumber: d.contract_number || '000001',
          docType: d.doc_type || 'CONTRATO',
          vehicleType: d.vehicle_type || 'MOTOCICLETA',
          date: d.date || '',
          customerName: d.customer_name || '',
          customerDocType: d.customer_doc_type || 'DNI',
          customerDoc: d.customer_doc || '',
          customerAddress: d.customer_address || '',
          customerPhone: d.customer_phone || '',
          maritalStatus: d.marital_status || 'SOLTERO',
          brand: d.brand || '',
          model: d.model || '',
          color: d.color || '',
          cylinderCapacity: d.cylinder_capacity || '',
          dua: d.dua || '',
          item: d.item || '',
          engineNumber: d.engine_number || '',
          chassisNumber: d.chassis_number || '',
          totalPrice: Number(d.total_price || 0),
          downPayment: Number(d.down_payment || 0),
          balance: Number(d.balance || 0),
          paymentMethodDetail: d.payment_method_detail || '',
          dueDate: d.due_date || '',
          balanceReason: d.balance_reason || '',
          notaryLegalization: d.notary_legalization || 'NO',
          observations: d.observations || '',
          status: d.status || 'VIGENTE',
          createdAt: d.created_at,
        }));
      }
    } catch {
      // fallback to localStorage
    }

    return getStoredContracts();
  },

  async getContractById(id: string): Promise<VehicleContract | null> {
    const contracts = await this.getContracts();
    return contracts.find((c) => c.id === id) || null;
  },

  async createContract(contract: Omit<VehicleContract, 'id' | 'createdAt'>): Promise<VehicleContract> {
    const tenantId = getActiveTenantId();
    const newId = 'c-' + Date.now().toString(36);
    const newContract: VehicleContract = {
      ...contract,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    // Try Supabase insertion
    try {
      await supabase.from('contracts').insert({
        id: newId,
        tenant_id: tenantId,
        contract_number: contract.contractNumber,
        doc_type: contract.docType,
        vehicle_type: contract.vehicleType,
        date: contract.date,
        customer_name: contract.customerName,
        customer_doc_type: contract.customerDocType,
        customer_doc: contract.customerDoc,
        customer_address: contract.customerAddress,
        customer_phone: contract.customerPhone,
        marital_status: contract.maritalStatus,
        brand: contract.brand,
        model: contract.model,
        color: contract.color,
        cylinder_capacity: contract.cylinderCapacity,
        dua: contract.dua,
        item: contract.item,
        engine_number: contract.engineNumber,
        chassis_number: contract.chassisNumber,
        total_price: contract.totalPrice,
        down_payment: contract.downPayment,
        balance: contract.balance,
        payment_method_detail: contract.paymentMethodDetail,
        due_date: contract.dueDate,
        balance_reason: contract.balanceReason,
        notary_legalization: contract.notaryLegalization,
        observations: contract.observations,
        status: contract.status,
      });
    } catch {
      // ignore
    }

    // Save to localStorage
    const list = getStoredContracts();
    list.unshift(newContract);
    localStorage.setItem(getStorageKey(), JSON.stringify(list));

    auditService.logAction({
      action: 'CREAR',
      entityType: 'contracts',
      entityId: newId,
      description: `Emisión de ${contract.docType || 'Contrato'} N° ${contract.contractNumber} para "${contract.customerName}" (Vehículo: ${contract.brand} ${contract.model}, Total: S/ ${Number(contract.totalPrice).toFixed(2)})`,
      details: {
        contract_number: contract.contractNumber,
        customer_name: contract.customerName,
        total_price: contract.totalPrice,
        vehicle: `${contract.brand} ${contract.model}`,
      },
    });

    return newContract;
  },

  async updateContract(id: string, updates: Partial<VehicleContract>): Promise<boolean> {
    try {
      await supabase.from('contracts').update({
        contract_number: updates.contractNumber,
        doc_type: updates.docType,
        vehicle_type: updates.vehicleType,
        date: updates.date,
        customer_name: updates.customerName,
        customer_doc_type: updates.customerDocType,
        customer_doc: updates.customerDoc,
        customer_address: updates.customerAddress,
        customer_phone: updates.customerPhone,
        marital_status: updates.maritalStatus,
        brand: updates.brand,
        model: updates.model,
        color: updates.color,
        cylinder_capacity: updates.cylinderCapacity,
        dua: updates.dua,
        item: updates.item,
        engine_number: updates.engineNumber,
        chassis_number: updates.chassisNumber,
        total_price: updates.totalPrice,
        down_payment: updates.downPayment,
        balance: updates.balance,
        payment_method_detail: updates.paymentMethodDetail,
        due_date: updates.dueDate,
        balance_reason: updates.balanceReason,
        notary_legalization: updates.notaryLegalization,
        observations: updates.observations,
        status: updates.status,
      }).eq('id', id);
    } catch {
      // ignore
    }

    const list = getStoredContracts();
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(getStorageKey(), JSON.stringify(list));

      auditService.logAction({
        action: 'MODIFICAR',
        entityType: 'contracts',
        entityId: id,
        description: `Actualización de Contrato N° ${list[idx].contractNumber || id} (Cliente: ${list[idx].customerName})`,
        details: { ...updates },
      });

      return true;
    }
    return false;
  },

  async deleteContract(id: string): Promise<boolean> {
    try {
      await supabase.from('contracts').delete().eq('id', id);
    } catch {
      // ignore
    }

    const list = getStoredContracts();
    const target = list.find((c) => c.id === id);
    const contractNum = target?.contractNumber || id;
    const custName = target?.customerName || '';

    const filtered = list.filter((c) => c.id !== id);
    localStorage.setItem(getStorageKey(), JSON.stringify(filtered));

    auditService.logAction({
      action: 'ELIMINAR',
      entityType: 'contracts',
      entityId: id,
      description: `Eliminación de Contrato N° ${contractNum} ${custName ? `(Cliente: ${custName})` : ''}`.trim(),
      details: { contract_number: contractNum, customer_name: custName },
    });

    return true;
  },

  getNextContractNumber(): string {
    const list = getStoredContracts();
    if (list.length === 0) return '000001';
    const numbers = list.map((c) => parseInt(c.contractNumber.replace(/\D/g, ''), 10) || 0);
    const maxNum = Math.max(...numbers, 0);
    return String(maxNum + 1).padStart(6, '0');
  },
};
