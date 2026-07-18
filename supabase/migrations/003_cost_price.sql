-- ============================================================
-- EzPDV — Cost Price Update
-- Execute this script in the Supabase SQL Editor
-- AFTER executing 002_multi_company.sql
-- ============================================================

-- 1. Add cost price setting to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS enable_cost_price BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add cost price to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- 3. Add cost price to sale items
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- 4. Add total profit to cash sessions
ALTER TABLE cash_sessions
  ADD COLUMN IF NOT EXISTS total_profit DECIMAL(10,2) NOT NULL DEFAULT 0.00;
