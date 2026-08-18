import { z } from 'zod';

// Currency enums
export const CurrencySchema = z.enum(['PEN', 'USD', 'EUR']);
export type CurrencyCode = z.infer<typeof CurrencySchema>;

// Document types
export const DocumentTypeSchema = z.enum(['DNI', 'RUC', 'CE', 'PASSPORT', 'BOLETA', 'FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO']);

// Payment methods
export const PaymentMethodSchema = z.enum(['CASH', 'TRANSFER', 'CARD', 'YAPE', 'PLIN', 'OTHER']);

// Movement types
export const MovementTypeSchema = z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']);

// Standard response
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});

// Shared pagination
export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// Auth schemas
export const StaffLoginSchema = z.object({
  tenant_ruc: z.string().min(8),
  username: z.string().min(1),
  password: z.string().min(4),
});

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

// Tenant schemas
export const TenantSchema = z.object({
  name: z.string().min(1),
  trade_name: z.string().optional(),
  ruc: z.string().min(8).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  currency_code: CurrencySchema.default('PEN'),
  tax_rate: z.number().default(18.0),
});
export const CreateTenantSchema = TenantSchema;
export const UpdateTenantSchema = TenantSchema.partial();

// Branch schemas
export const BranchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  manager_name: z.string().optional(),
});
export const CreateBranchSchema = BranchSchema;
export const UpdateBranchSchema = BranchSchema.partial();

// Category schema
export const CategorySchema = z.object({
  name: z.string().min(1),
  parent_id: z.string().uuid().optional(),
  sort_order: z.number().default(0),
});
export const CreateCategorySchema = CategorySchema;

// Product schemas
export const ProductSchema = z.object({
  name: z.string().min(1),
  product_type_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  model_id: z.string().uuid().optional(),
  code: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  cost: z.number().min(0).default(0),
  price: z.number().min(0).default(0),
  min_price: z.number().min(0).default(0),
  min_stock: z.number().min(0).default(0),
  short_description: z.string().optional(),
  full_description: z.string().optional(),
  stock_control: z.enum(['QUANTITY', 'UNIT']).default('QUANTITY'),
});
export const CreateProductSchema = ProductSchema;
export const UpdateProductSchema = ProductSchema.partial();

// Customer schema
export const CustomerSchema = z.object({
  customer_type: z.enum(['PERSON', 'BUSINESS']).default('PERSON'),
  document_type: DocumentTypeSchema.optional(),
  document_number: z.string().optional(),
  full_name: z.string().optional(),
  business_name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});
export const CreateCustomerSchema = CustomerSchema;

// Supplier schema
export const SupplierSchema = z.object({
  business_name: z.string().min(1),
  ruc: z.string().optional(),
  contact_name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});
export const CreateSupplierSchema = SupplierSchema;

// Sale item schema
export const SaleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().min(0.01),
  unit_price: z.number().min(0),
  discount: z.number().min(0).default(0),
});

// Sale schema
export const CreateSaleSchema = z.object({
  branch_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  payment_method: PaymentMethodSchema.default('CASH'),
  cash_register_id: z.string().uuid().optional(),
  items: z.array(SaleItemSchema).min(1),
  discount_amount: z.number().default(0),
  notes: z.string().optional(),
});

// Purchase Order schema
export const CreatePurchaseSchema = z.object({
  supplier_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().min(0.01),
    unit_cost: z.number().min(0),
  })).min(1),
  notes: z.string().optional(),
});

// Cash Register schema
export const OpenCashRegisterSchema = z.object({
  branch_id: z.string().uuid(),
  opening_amount: z.number().min(0),
});

export const CreateCashMovementSchema = z.object({
  movement_type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().min(0.01),
  reason: z.string().min(1),
});

// Invoice schema
export const CreateInvoiceSchema = z.object({
  sale_id: z.string().uuid(),
  document_type: DocumentTypeSchema,
  series: z.string().min(1),
});