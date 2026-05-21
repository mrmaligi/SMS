-- Setup schema for LabKey Stock Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index SKU for speed
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 2. Stock Transactions Table
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity_change INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'sale', 'manual_adjustment')),
    invoice_ref VARCHAR(255),
    notes TEXT,
    performed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_product ON stock_transactions(product_id);

-- 3. Invoice Logs Table
CREATE TABLE IF NOT EXISTS invoice_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending_approval', 'reconciled', 'failed')),
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - optional but recommended for security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_logs ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies (since we authenticate on the Next.js server side using service role or simple secret keys)
-- You can tighten these up or just use service role access in production.
CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public write access to products" ON products FOR ALL USING (true);

CREATE POLICY "Allow public read access to stock_transactions" ON stock_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public write access to stock_transactions" ON stock_transactions FOR ALL USING (true);

CREATE POLICY "Allow public read access to invoice_logs" ON invoice_logs FOR SELECT USING (true);
CREATE POLICY "Allow public write access to invoice_logs" ON invoice_logs FOR ALL USING (true);
