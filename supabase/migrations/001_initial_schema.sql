-- ============================================================
-- EzPDV — Schema Completo v2.0
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- LIMPEZA: Remover tabelas antigas (se existirem)
-- A ordem importa para respeitar as foreign keys
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS sale_payments  CASCADE;
DROP TABLE IF EXISTS sale_items     CASCADE;
DROP TABLE IF EXISTS sales          CASCADE;
DROP TABLE IF EXISTS cash_movements CASCADE;
DROP TABLE IF EXISTS cash_sessions  CASCADE;
DROP TABLE IF EXISTS products       CASCADE;
DROP TABLE IF EXISTS categories     CASCADE;
DROP TABLE IF EXISTS operators      CASCADE;

-- ────────────────────────────────────────────────────────────
-- 1. OPERADORES (Usuários do sistema)
-- ────────────────────────────────────────────────────────────
CREATE TABLE operators (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  pin         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO operators (id, name, role, pin) VALUES
  ('Josy', 'Gerente',  'admin',    '1234'),
  ('Maria', 'Caixa 1',  'operator', '0000');

-- ────────────────────────────────────────────────────────────
-- 2. CATEGORIAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'Tag',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categories (id, name, icon, sort_order) VALUES
  ('all',        'Todos',          'Grid',    0),
  ('casquinhas', 'Casquinhas',     'Cone',    1),
  ('milkshakes', 'Milkshakes',     'CupSoda', 2),
  ('sundaes',    'Sundaes & Taças','Dessert', 3),
  ('bebidas',    'Bebidas',        'Beer',    4);

-- ────────────────────────────────────────────────────────────
-- 3. PRODUTOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#FFFFFF',
  description TEXT
);

INSERT INTO products (id, name, price, category, color, description) VALUES
  ('1',  'Casquinha Baunilha',          6.50, 'casquinhas', '#FFF4D4', 'Casquinha crocante com sorvete cremoso de baunilha.'),
  ('2',  'Casquinha Chocolate',         6.50, 'casquinhas', '#E2C4B1', 'Casquinha crocante com sorvete cremoso de chocolate belga.'),
  ('3',  'Casquinha Mista',             7.00, 'casquinhas', '#F4E3D3', 'Casquinha crocante misturando baunilha e chocolate.'),
  ('4',  'Cascão Trufado',             12.00, 'casquinhas', '#D8BCA3', 'Cascão crocante com borda trufada de chocolate e sorvete a escolha.'),
  ('5',  'Milkshake Ovomaltine 500ml', 16.90, 'milkshakes', '#E6D3C3', 'Milkshake cremoso de chocolate com flocos crocantes de Ovomaltine.'),
  ('6',  'Milkshake Morango 500ml',    15.90, 'milkshakes', '#FFD1DC', 'Milkshake feito com sorvete de morango e calda artesanal.'),
  ('7',  'Milkshake Ninho com Nutella',18.90, 'milkshakes', '#FFF0F5', 'Milkshake de leite Ninho mesclado com muita Nutella original.'),
  ('8',  'Sundae Morango',             13.50, 'sundaes',    '#FFC0CB', 'Taça de sorvete de baunilha, calda quente de morango e castanhas.'),
  ('9',  'Sundae Chocolate',           13.50, 'sundaes',    '#D2B48C', 'Taça de sorvete de chocolate, calda quente de chocolate e wafer.'),
  ('10', 'Banana Split',               22.00, 'sundaes',    '#FFF8DC', 'Clássica banana split com 3 bolas de sorvete, caldas e chantilly.'),
  ('11', 'Água Mineral 500ml',          4.00, 'bebidas',    '#E0F7FA', 'Água mineral sem gás bem gelada.'),
  ('12', 'Refrigerante Lata',           6.00, 'bebidas',    '#FFCDD2', 'Coca-Cola, Guaraná Antarctica ou Sprite em lata.');

-- ────────────────────────────────────────────────────────────
-- 4. SESSÕES DE CAIXA
-- ────────────────────────────────────────────────────────────
CREATE TABLE cash_sessions (
  id              TEXT PRIMARY KEY,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  opened_by       TEXT NOT NULL,
  closed_by       TEXT,
  starting_cash   NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash_sales      NUMERIC(10,2) NOT NULL DEFAULT 0,
  pix_sales       NUMERIC(10,2) NOT NULL DEFAULT 0,
  credit_sales    NUMERIC(10,2) NOT NULL DEFAULT 0,
  debit_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_reforcos  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sangrias  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_cash      NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT
);

CREATE INDEX idx_cash_sessions_opened_at ON cash_sessions(opened_at DESC);
CREATE INDEX idx_cash_sessions_closed_at ON cash_sessions(closed_at);

-- ────────────────────────────────────────────────────────────
-- 5. MOVIMENTAÇÕES DE CAIXA (Nova — substitui coluna JSON)
-- ────────────────────────────────────────────────────────────
CREATE TABLE cash_movements (
  id               TEXT PRIMARY KEY,
  cash_session_id  TEXT NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('sangria', 'reforco')),
  amount           NUMERIC(10,2) NOT NULL,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operator         TEXT NOT NULL,
  reason           TEXT
);

CREATE INDEX idx_cash_movements_session ON cash_movements(cash_session_id);

-- ────────────────────────────────────────────────────────────
-- 6. VENDAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE sales (
  id               TEXT PRIMARY KEY,
  date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total            NUMERIC(10,2) NOT NULL,
  sold_by          TEXT NOT NULL,
  cash_session_id  TEXT REFERENCES cash_sessions(id)
);

CREATE INDEX idx_sales_date    ON sales(date DESC);
CREATE INDEX idx_sales_session ON sales(cash_session_id);

-- ────────────────────────────────────────────────────────────
-- 7. ITENS DE VENDA
-- ────────────────────────────────────────────────────────────
CREATE TABLE sale_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  notes        TEXT
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ────────────────────────────────────────────────────────────
-- 8. PAGAMENTOS DE VENDA (Nova — substitui campo JSON)
-- ────────────────────────────────────────────────────────────
CREATE TABLE sale_payments (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id  TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method   TEXT NOT NULL CHECK (method IN ('Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX')),
  amount   NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);

-- ============================================================
-- PERMISSÕES (Row Level Security)
-- Permite acesso via anon key sem autenticação
-- ============================================================
ALTER TABLE operators      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_operators"      ON operators      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_categories"     ON categories     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_products"       ON products       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_cash_sessions"  ON cash_sessions  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_cash_movements" ON cash_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sales"          ON sales          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sale_items"     ON sale_items     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sale_payments"  ON sale_payments  FOR ALL USING (true) WITH CHECK (true);
