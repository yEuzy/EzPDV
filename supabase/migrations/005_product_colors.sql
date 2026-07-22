-- Migration 005: Add enable_product_colors to companies

ALTER TABLE companies ADD COLUMN IF NOT EXISTS enable_product_colors BOOLEAN DEFAULT TRUE;
