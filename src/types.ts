// ─── Empresa ───────────────────────────────────────────────────────────────────
export type ThemeId = 'gelato' | 'sky' | 'forest' | 'ember';

export interface Company {
  id: string;
  name: string;
  tagline: string;
  theme_id: ThemeId;
  icon: string;
  created_at?: string;
}

// ─── Produto ───────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  color: string;
  description?: string;
  company_id: string;
}

// ─── Item do Carrinho ──────────────────────────────────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

// ─── Pagamento de Venda ────────────────────────────────────────────────────────
export interface SalePayment {
  method: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX';
  amount: number;
}

// ─── Venda ─────────────────────────────────────────────────────────────────────
export interface Sale {
  id: string;
  date: string; // ISO Date String
  items: CartItem[];
  total: number;
  payments: SalePayment[];
  soldBy: string;
  company_id: string;
}

// ─── Categoria ────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order?: number;
  company_id: string;
}

// ─── Operador / Usuário ───────────────────────────────────────────────────────
export interface Operator {
  id: string;
  name: string;
  role: 'operator' | 'admin';
  pin: string; // PIN de 4 dígitos (nunca enviar ao cliente em produção)
  created_at?: string;
  company_id: string;
}

// ─── Movimentação de Caixa ────────────────────────────────────────────────────
export interface CashMovement {
  id: string;
  type: 'sangria' | 'reforco';
  amount: number;
  timestamp: string;
  operator: string;
  reason?: string;
}

// ─── Estado do Caixa (em memória / abertura atual) ───────────────────────────
export interface CashRegister {
  isOpen: boolean;
  openedAt: string | null;
  openedBy: string | null;
  startingCash: number;
  movements: CashMovement[];
  id?: string | null;
  company_id?: string;
}

// ─── Sessão de Caixa Encerrada ────────────────────────────────────────────────
export interface CashRegisterSession {
  id: string;
  openedAt: string;
  closedAt: string;
  openedBy: string;
  closedBy: string;
  startingCash: number;
  cashSales: number;
  pixSales: number;
  creditSales: number;
  debitSales: number;
  totalReforcos: number;
  totalSangrias: number;
  totalSales: number;
  finalCash: number;
  notes?: string;
  movements: CashMovement[];
  company_id?: string;
}
