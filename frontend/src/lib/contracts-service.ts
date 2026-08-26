import { supabase, DEFAULT_TENANT_ID } from './supabase';

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

const STORAGE_KEY = 'ventasbv_vehicle_contracts';

const getInitialContracts = (): VehicleContract[] => {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch {
      // ignore
    }
  }
  const defaultContracts: VehicleContract[] = [
    {
      id: 'c-001',
      contractNumber: '000157',
      docType: 'CONTRATO',
      vehicleType: 'MOTOCICLETA',
      date: '2026-05-04',
      customerName: 'CONTRERAS TORRES NILVER EVER',
      customerDocType: 'DNI',
      customerDoc: '60413282',
      customerAddress: 'Av. Los Próceres 1240, Surco, Lima',
      customerPhone: '993275893',
      maritalStatus: 'SOLTERO',
      brand: 'BAJAJ',
      model: 'PULSAR 400 Z',
      color: 'Amarillo, Gris',
      cylinderCapacity: '373 cc',
      dua: '118-2026-10-045821',
      item: '01',
      engineNumber: 'JLXCSH51401',
      chassisNumber: 'MD2C49NX8TCK74226',
      totalPrice: 17740.00,
      downPayment: 10740.00,
      balance: 7000.00,
      paymentMethodDetail: 'BCP: 03596987',
      dueDate: '2026-05-04',
      balanceReason: '7000 Anticipo / Saldo contraentrega de placa y tarjeta',
      notaryLegalization: 'SI_20',
      observations: 'Unidad en exhibición con entrega inmediata. Trámite de placa y tarjeta de propiedad en curso.',
      status: 'VIGENTE',
      createdAt: '2026-05-04T10:30:00Z',
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultContracts));
  return defaultContracts;
};

export const contractsService = {
  async getContracts(): Promise<VehicleContract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .or(`tenant_id.eq.${DEFAULT_TENANT_ID},tenant_id.is.null`)
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

    return getInitialContracts();
  },

  async getContractById(id: string): Promise<VehicleContract | null> {
    const contracts = await this.getContracts();
    return contracts.find((c) => c.id === id) || null;
  },

  async createContract(contract: Omit<VehicleContract, 'id' | 'createdAt'>): Promise<VehicleContract> {
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
        tenant_id: DEFAULT_TENANT_ID,
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
    const list = getInitialContracts();
    list.unshift(newContract);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

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

    const list = getInitialContracts();
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

    const list = getInitialContracts();
    const filtered = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  getNextContractNumber(): string {
    const list = getInitialContracts();
    if (list.length === 0) return '000001';
    const numbers = list.map((c) => parseInt(c.contractNumber.replace(/\D/g, ''), 10) || 0);
    const maxNum = Math.max(...numbers, 0);
    return String(maxNum + 1).padStart(6, '0');
  },
};
