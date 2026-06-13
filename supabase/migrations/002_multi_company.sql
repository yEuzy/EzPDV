-- ============================================================
-- EzPDV — Multi-Empresa v1.0
-- Execute este script no SQL Editor do Supabase Dashboard
-- APÓS ter executado o 001_initial_schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABELA DE EMPRESAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  tagline    TEXT NOT NULL DEFAULT '',
  theme_id   TEXT NOT NULL DEFAULT 'gelato'
             CHECK (theme_id IN ('gelato', 'sky', 'forest', 'ember')),
  icon       TEXT NOT NULL DEFAULT 'IceCreamCone',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_companies" ON companies FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 2. ADICIONAR company_id EM TODAS AS TABELAS
-- ────────────────────────────────────────────────────────────

-- Operators
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT '';

-- Categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT '';

-- Products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT '';

-- Sales
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT '';

-- Cash Sessions
ALTER TABLE cash_sessions
  ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT '';

-- ────────────────────────────────────────────────────────────
-- 3. ÍNDICES DE PERFORMANCE
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_operators_company     ON operators(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_company    ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company      ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company         ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_company ON cash_sessions(company_id);

-- ────────────────────────────────────────────────────────────
-- 4. EXEMPLO: Empresa de demonstração
-- ────────────────────────────────────────────────────────────
-- Descomente e adapte para criar sua primeira empresa:
--
-- INSERT INTO companies (id, name, tagline, theme_id, icon) VALUES
--   ('gelateria-bella', 'Gelateria Bella', 'Quiosque de Sorvete', 'gelato', 'IceCreamCone');
--
-- UPDATE operators     SET company_id = 'gelateria-bella' WHERE company_id = '';
-- UPDATE categories    SET company_id = 'gelateria-bella' WHERE company_id = '';
-- UPDATE products      SET company_id = 'gelateria-bella' WHERE company_id = '';
-- UPDATE sales         SET company_id = 'gelateria-bella' WHERE company_id = '';
-- UPDATE cash_sessions SET company_id = 'gelateria-bella' WHERE company_id = '';

-- ────────────────────────────────────────────────────────────
-- 5. NOTA SOBRE SEGURANÇA
-- ────────────────────────────────────────────────────────────
-- O isolamento de dados por empresa é feito no código TypeScript
-- via .eq('company_id', companyId) em cada query.
-- O company_id do deploy vem do VITE_COMPANY_ID no arquivo .env,
-- que é controlado pelo administrador do sistema, não pelo usuário.
