import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock_alert: number;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  quantity_change: number;
  type: 'purchase' | 'sale' | 'manual_adjustment';
  invoice_ref: string | null;
  notes: string | null;
  performed_by: string;
  created_at: string;
  products?: {
    sku: string;
    name: string;
  };
}

export interface InvoiceLog {
  id: string;
  file_name: string;
  status: 'pending_approval' | 'reconciled' | 'failed';
  raw_response: any;
  created_at: string;
  updated_at: string;
}
