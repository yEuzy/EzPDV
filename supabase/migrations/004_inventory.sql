-- ============================================================
-- EzPDV — Inventory Update
-- Execute this script in the Supabase SQL Editor
-- AFTER executing 003_cost_price.sql
-- ============================================================

-- 1. Add inventory setting to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS enable_inventory BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add stock quantity to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
